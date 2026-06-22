import type {
  AgentActionApproveRequest,
  AgentActionApproveResponse,
  AgentActionCancelResponse,
  AgentActionProposeRequest,
  AgentActionProposeResponse,
  AgentChatRequest,
  AgentChatResponse,
  AgentProposedAction,
  AgentSessionDetail,
} from '@osct/shared';
import type { Env } from '../config/env.js';
import {
  createAgentLlmClient,
} from '../infrastructure/llm/createAgentLlmClient.js';
import { LlmApiError } from '../infrastructure/llm/types.js';
import type { AgentLlmConfig } from '../infrastructure/llm/types.js';
import { GitHubApi } from '../infrastructure/github/api.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  AgentRepository,
  mapAgentActionRow,
} from '../repositories/agentRepository.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { ActionPolicy } from './actionPolicy.js';
import { parseAgentActionBlocks, inferProposalsFromDraft } from './agentActionParser.js';
import { AgentTools, contextRefFromAgentContext } from './agentTools.js';
import type pg from 'pg';

const SYSTEM_PROMPT = `You are the OSCT Issue Assistant inside Open Source Contribution Tracker.

Your job:
- Help the user understand open-source issues and pull requests in their inbox
- Explain why an issue might be stuck and what to do next
- Draft helpful GitHub comments and propose posting them (user must approve before anything is posted)
- Suggest concrete next steps: clarify requirements, ask for assignment, provide repro steps, link a PR

Rules:
- Use only the context provided below. If data is missing, say so and suggest syncing from GitHub.
- Be concise, friendly, and actionable. Use short paragraphs or bullet lists.
- Never claim you posted, merged, closed, or changed anything on GitHub unless the user has approved an action in the UI.
- When drafting a comment for GitHub, put the exact text in a fenced code block labeled "Suggested comment".
- If the user wants to post (or asks you to prepare for posting), also include an agent_action block with the exact comment text:

\`\`\`agent_action
{"type":"comment_on_issue","owner":"OWNER","repo":"REPO","number":123,"body":"Exact comment text to post"}
\`\`\`

Agent action rules:
- Only propose comment_on_issue for issues in the user's context
- The body must be the final comment text (plain text or GitHub-flavored markdown)
- Use owner/repo/number from the focused issue when available
- You propose actions — the user reviews and clicks Approve in the UI before anything is posted
- If the user asks about repos or issues not in context, explain you only see their synced OSCT data plus the focused issue when selected.`;

type RateBucket = {
  count: number;
  resetAt: number;
};

export class AgentService {
  private agents: AgentRepository;
  private tools: AgentTools;
  private policy: ActionPolicy;
  private oauth: OAuthRepository;
  private llm: AgentLlmConfig | null;
  private rateLimits = new Map<string, RateBucket>();

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.agents = new AgentRepository(db);
    this.tools = new AgentTools(env, db);
    this.policy = new ActionPolicy(new ContributionRepository(db));
    this.oauth = new OAuthRepository(db);
    this.llm = createAgentLlmClient(env);
  }

  isEnabled(): boolean {
    return Boolean(this.llm);
  }

  getProviderInfo(): { provider: string; model: string } | null {
    if (!this.llm) return null;
    return { provider: this.llm.provider, model: this.llm.model };
  }

  async chat(userId: string, input: AgentChatRequest): Promise<AgentChatResponse> {
    this.assertEnabled();
    this.assertRateLimit(userId);

    const message = input.message.trim();
    if (!message) {
      throw new AppError(400, 'Message is required', 'VALIDATION_ERROR');
    }
    if (message.length > 4000) {
      throw new AppError(400, 'Message is too long (max 4000 characters)', 'VALIDATION_ERROR');
    }

    let session =
      input.sessionId != null
        ? await this.agents.getSessionForUser(input.sessionId, userId)
        : null;

    if (input.sessionId && !session) {
      throw new AppError(404, 'Agent session not found', 'NOT_FOUND');
    }

    if (!session) {
      session = await this.agents.createSession({
        userId,
        contextType: input.context?.type ?? 'general',
        contextRef: contextRefFromAgentContext(input.context),
      });
    }

    await this.agents.addMessage({
      sessionId: session.id,
      role: 'user',
      content: message,
    });

    const contextBundle = await this.tools.buildContext(userId, input.context);
    const history = await this.agents.listMessages(session.id, 20);
    const priorTurns = history
      .filter((row) => row.role === 'user' || row.role === 'assistant')
      .slice(0, -1)
      .map((row) => ({
        role: row.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: row.content,
      }));

    let rawReply: string;
    try {
      rawReply = await this.llm!.client.generateReply({
        systemInstruction: `${SYSTEM_PROMPT}\n\n---\n\n# User context\n\n${contextBundle.text}`,
        messages: [...priorTurns, { role: 'user', content: message }],
      });
    } catch (err) {
      throw toAgentLlmError(err);
    }

    const { cleanReply, proposals: explicitProposals } = parseAgentActionBlocks(rawReply);
    const draftProposals =
      explicitProposals.length === 0
        ? inferProposalsFromDraft(rawReply, message, input.context)
        : [];
    const allProposals = [...explicitProposals, ...draftProposals];

    const proposedActions = await this.createProposals(
      userId,
      session.id,
      allProposals,
    );

    await this.agents.addMessage({
      sessionId: session.id,
      role: 'assistant',
      content: cleanReply || rawReply,
    });
    await this.agents.touchSession(session.id);

    return {
      sessionId: session.id,
      reply: cleanReply || rawReply,
      sources: contextBundle.sources,
      proposedActions,
    };
  }

  async getSession(userId: string, sessionId: string): Promise<AgentSessionDetail> {
    const session = await this.agents.getSessionForUser(sessionId, userId);
    if (!session) {
      throw new AppError(404, 'Agent session not found', 'NOT_FOUND');
    }

    const [messages, actionRows] = await Promise.all([
      this.agents.listMessages(sessionId, 50),
      this.agents.listActionsForSession(sessionId, 20),
    ]);

    return {
      id: session.id,
      contextType:
        session.context_type === 'issue' ||
        session.context_type === 'pull_request' ||
        session.context_type === 'general'
          ? session.context_type
          : null,
      contextRef: session.context_ref,
      createdAt: session.created_at.toISOString(),
      updatedAt: session.updated_at.toISOString(),
      messages: messages
        .filter((row) => row.role === 'user' || row.role === 'assistant')
        .map((row) => ({
          id: row.id,
          role: row.role === 'assistant' ? 'assistant' : 'user',
          content: row.content,
          createdAt: row.created_at.toISOString(),
        })),
      actions: actionRows.map(mapAgentActionRow),
    };
  }

  async proposeAction(
    userId: string,
    input: AgentActionProposeRequest,
  ): Promise<AgentActionProposeResponse> {
    this.assertEnabled();

    const session = await this.agents.getSessionForUser(input.sessionId, userId);
    if (!session) {
      throw new AppError(404, 'Agent session not found', 'NOT_FOUND');
    }

    const payload = {
      owner: input.owner.trim(),
      repo: input.repo.trim(),
      number: input.number,
      body: input.body.trim(),
    };

    this.policy.assertCommentPayload(payload);
    await this.policy.assertIssueInUserScope(userId, payload);

    const row = await this.agents.createAction({
      sessionId: session.id,
      userId,
      actionType: 'comment_on_issue',
      payload,
    });

    return mapAgentActionRow(row);
  }

  async approveAction(
    userId: string,
    actionId: string,
    input: AgentActionApproveRequest,
  ): Promise<AgentActionApproveResponse> {
    this.assertEnabled();

    const action = await this.agents.getActionForUser(actionId, userId);
    if (!action) {
      throw new AppError(404, 'Agent action not found', 'NOT_FOUND');
    }
    if (action.status !== 'pending') {
      throw new AppError(400, 'This action is no longer pending', 'VALIDATION_ERROR');
    }

    const payload = {
      ...action.payload,
      body: input.body?.trim() || action.payload.body,
    };

    this.policy.assertCommentPayload(payload);
    await this.policy.assertIssueInUserScope(userId, payload);

    if (input.body?.trim() && input.body.trim() !== action.payload.body) {
      await this.agents.updateActionPayload(actionId, payload);
    }

    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new AppError(
        401,
        'GitHub token missing. Sign out and sign in again to post comments.',
        'UNAUTHORIZED',
      );
    }

    const gh = new GitHubApi(token);

    try {
      const comment = await gh.createIssueComment(
        payload.owner,
        payload.repo,
        payload.number,
        payload.body,
      );

      await this.agents.markActionCompleted(actionId, {
        html_url: comment.html_url,
        id: comment.id,
      });

      return {
        id: actionId,
        status: 'completed',
        githubUrl: comment.html_url,
      };
    } catch (err) {
      const message = toGitHubWriteError(err);
      await this.agents.markActionFailed(actionId, message);
      throw new AppError(502, message, 'GITHUB_WRITE_FAILED');
    }
  }

  async cancelAction(userId: string, actionId: string): Promise<AgentActionCancelResponse> {
    const action = await this.agents.getActionForUser(actionId, userId);
    if (!action) {
      throw new AppError(404, 'Agent action not found', 'NOT_FOUND');
    }
    if (action.status !== 'pending') {
      throw new AppError(400, 'This action is no longer pending', 'VALIDATION_ERROR');
    }

    await this.agents.markActionCancelled(actionId);

    return { id: actionId, status: 'cancelled' };
  }

  private assertEnabled(): void {
    if (!this.llm) {
      throw new AppError(
        503,
        'OSCT Agent is not configured. Set GROQ_API_KEY (recommended), OPENAI_API_KEY, or GEMINI_API_KEY in .env.',
        'AGENT_DISABLED',
      );
    }
  }

  private assertRateLimit(userId: string): void {
    const limit = this.env.AGENT_RATE_LIMIT_PER_HOUR;
    const now = Date.now();
    const bucket = this.rateLimits.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + 60 * 60 * 1000 });
      return;
    }

    if (bucket.count >= limit) {
      throw new AppError(
        429,
        `Agent rate limit reached (${limit} messages per hour). Try again later.`,
        'RATE_LIMITED',
      );
    }

    bucket.count += 1;
  }

  private async createProposals(
    userId: string,
    sessionId: string,
    proposals: Array<{ owner: string; repo: string; number: number; body: string }>,
  ): Promise<AgentProposedAction[]> {
    const proposedActions: AgentProposedAction[] = [];

    for (const proposal of proposals) {
      try {
        this.policy.assertCommentPayload(proposal);
        await this.policy.assertIssueInUserScope(userId, proposal);
        const row = await this.agents.createAction({
          sessionId,
          userId,
          actionType: 'comment_on_issue',
          payload: proposal,
        });
        proposedActions.push(mapAgentActionRow(row));
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 403) {
          continue;
        }
        if (err instanceof AppError) {
          throw err;
        }
      }
    }

    return proposedActions;
  }
}

function toAgentLlmError(err: unknown): AppError {
  if (err instanceof LlmApiError) {
    if (err.statusCode === 429) {
      return new AppError(
        429,
        `${err.provider} API quota exceeded. Wait a few minutes or switch AGENT_PROVIDER in .env.`,
        'LLM_QUOTA',
      );
    }
    if (err.statusCode === 401 || err.statusCode === 403) {
      return new AppError(
        502,
        `${err.provider} API key is invalid. Check your API key in .env and restart the API.`,
        'LLM_AUTH',
      );
    }
    if (err.statusCode === 404) {
      return new AppError(
        502,
        `${err.provider} model not found: ${err.message}. Check AGENT_MODEL in .env.`,
        'LLM_MODEL',
      );
    }
    return new AppError(502, `${err.provider} API error: ${err.message}`, 'LLM_ERROR');
  }

  if (err instanceof Error) {
    return new AppError(502, err.message, 'LLM_ERROR');
  }

  return new AppError(502, 'Agent request failed', 'LLM_ERROR');
}

function toGitHubWriteError(err: unknown): string {
  if (!(err instanceof Error)) {
    return 'Failed to post comment on GitHub';
  }

  if (err.message.includes('(403)')) {
    return 'GitHub rejected the comment (403). Sign out and sign in again to refresh your repo permissions.';
  }
  if (err.message.includes('(404)')) {
    return 'Issue not found on GitHub. It may have been moved or deleted.';
  }
  if (err.message.includes('(422)')) {
    return 'GitHub rejected the comment (422). The issue may be locked or the comment is invalid.';
  }

  return err.message.slice(0, 400);
}
