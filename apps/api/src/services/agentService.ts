import type { AgentChatRequest, AgentChatResponse, AgentSessionDetail } from '@osct/shared';
import type { Env } from '../config/env.js';
import {
  createAgentLlmClient,
} from '../infrastructure/llm/createAgentLlmClient.js';
import { LlmApiError } from '../infrastructure/llm/types.js';
import type { AgentLlmConfig } from '../infrastructure/llm/types.js';
import { AppError } from '../middleware/errorHandler.js';
import { AgentRepository } from '../repositories/agentRepository.js';
import { AgentTools, contextRefFromAgentContext } from './agentTools.js';
import type pg from 'pg';

const SYSTEM_PROMPT = `You are the OSCT Issue Assistant — a read-only helper inside Open Source Contribution Tracker.

Your job:
- Help the user understand open-source issues and pull requests in their inbox
- Explain why an issue might be stuck and what to do next
- Draft helpful GitHub comments they can copy (you cannot post to GitHub yet)
- Suggest concrete next steps: clarify requirements, ask for assignment, provide repro steps, link a PR

Rules:
- Use only the context provided below. If data is missing, say so and suggest syncing from GitHub.
- Be concise, friendly, and actionable. Use short paragraphs or bullet lists.
- Never claim you posted, merged, closed, or changed anything on GitHub.
- When drafting a comment, wrap it in a fenced code block labeled "Suggested comment".
- If the user asks about repos or issues not in context, explain you only see their synced OSCT data plus the focused issue/PR when selected.`;

type RateBucket = {
  count: number;
  resetAt: number;
};

export class AgentService {
  private agents: AgentRepository;
  private tools: AgentTools;
  private llm: AgentLlmConfig | null;
  private rateLimits = new Map<string, RateBucket>();

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.agents = new AgentRepository(db);
    this.tools = new AgentTools(env, db);
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

    let reply: string;
    try {
      reply = await this.llm!.client.generateReply({
        systemInstruction: `${SYSTEM_PROMPT}\n\n---\n\n# User context\n\n${contextBundle.text}`,
        messages: [...priorTurns, { role: 'user', content: message }],
      });
    } catch (err) {
      throw toAgentLlmError(err);
    }

    await this.agents.addMessage({
      sessionId: session.id,
      role: 'assistant',
      content: reply,
    });
    await this.agents.touchSession(session.id);

    return {
      sessionId: session.id,
      reply,
      sources: contextBundle.sources,
    };
  }

  async getSession(userId: string, sessionId: string): Promise<AgentSessionDetail> {
    const session = await this.agents.getSessionForUser(sessionId, userId);
    if (!session) {
      throw new AppError(404, 'Agent session not found', 'NOT_FOUND');
    }

    const messages = await this.agents.listMessages(sessionId, 50);

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
    };
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
