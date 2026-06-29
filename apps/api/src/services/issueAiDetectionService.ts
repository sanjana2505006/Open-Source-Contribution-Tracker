import { z } from 'zod';
import type { IssueAiCheckRequest, IssueAiCheckResult } from '@osct/shared';
import type { Env } from '../config/env.js';
import { GitHubApi } from '../infrastructure/github/api.js';
import { createAgentLlmClient } from '../infrastructure/llm/createAgentLlmClient.js';
import { LlmApiError } from '../infrastructure/llm/types.js';
import { parseIssueUrl } from '../lib/issueRef.js';
import { AppError } from '../middleware/errorHandler.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';
import type pg from 'pg';

const DISCLAIMER =
  'Heuristic estimate only — patterns suggest AI assistance but this is not proof. Skilled humans and AI-assisted work can look similar.';

const SYSTEM_PROMPT = `You estimate how likely a GitHub issue's content was AI-generated (ChatGPT, Copilot, Claude, etc.).

Rules:
- This is a heuristic, not forensic proof.
- Score 0 = very likely human-written, 100 = very likely mostly AI-generated.
- Consider issue title, description tone, comment style, boilerplate, overly polished prose, generic templates.
- Be fair: experienced humans write clear issues; AI-assisted issues may be lightly edited.
- Respond with ONLY valid JSON matching the schema. No markdown fences.`;

const analysisSchema = z.object({
  overallAiPercent: z.number().min(0).max(100),
  confidence: z.enum(['low', 'medium', 'high']),
  sections: z
    .array(
      z.object({
        name: z.enum(['description', 'comments', 'title']),
        aiLikelihoodPercent: z.number().min(0).max(100),
        rationale: z.string().min(1).max(500),
      }),
    )
    .length(3),
  signals: z.array(z.string().min(1).max(200)).max(8),
});

type RateBucket = { count: number; resetAt: number };

const MAX_COMMENTS = 10;
const MAX_COMMENT_CHARS = 1200;

export class IssueAiDetectionService {
  private oauth: OAuthRepository;
  private userRepos: UserRepositoryLinkRepository;
  private llm;
  private rateLimits = new Map<string, RateBucket>();

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.oauth = new OAuthRepository(db);
    this.userRepos = new UserRepositoryLinkRepository(db);
    this.llm = createAgentLlmClient(env);
  }

  isEnabled(): boolean {
    return Boolean(this.llm);
  }

  resolveTarget(input: IssueAiCheckRequest): { owner: string; repo: string; number: number } {
    if (input.url?.trim()) {
      const parsed = parseIssueUrl(input.url);
      if (!parsed) {
        throw new AppError(400, 'Invalid GitHub issue URL', 'VALIDATION_ERROR');
      }
      return parsed;
    }

    const owner = input.owner?.trim();
    const repo = input.repo?.trim();
    const number = input.number;
    if (!owner || !repo || !number || !Number.isFinite(number) || number < 1) {
      throw new AppError(
        400,
        'Provide a GitHub issue URL or owner, repo, and number',
        'VALIDATION_ERROR',
      );
    }

    return { owner, repo, number };
  }

  async analyze(userId: string, input: IssueAiCheckRequest): Promise<IssueAiCheckResult> {
    if (!this.llm) {
      throw new AppError(
        503,
        'AI analysis is not configured on the server (missing LLM API key).',
        'AGENT_DISABLED',
      );
    }

    this.assertRateLimit(userId);

    const target = this.resolveTarget(input);
    const fullName = `${target.owner}/${target.repo}`;

    const inScope = await this.userRepos.userHasRepo(userId, fullName);
    if (!inScope) {
      throw new AppError(
        403,
        `Repo ${fullName} is not in your synced OSCT repos. Sync it first, then analyze issues in that repo.`,
        'FORBIDDEN',
      );
    }

    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new AppError(
        401,
        'GitHub token missing. Sign out and sign in again to analyze issues.',
        'UNAUTHORIZED',
      );
    }

    const gh = new GitHubApi(token);

    let issue;
    let comments;
    try {
      [issue, comments] = await Promise.all([
        gh.getIssue(target.owner, target.repo, target.number),
        gh.listIssueComments(target.owner, target.repo, target.number),
      ]);
    } catch {
      throw new AppError(404, 'Issue not found on GitHub', 'NOT_FOUND');
    }

    const commentBlock =
      comments.length === 0
        ? '_No comments yet._'
        : comments
            .slice(-MAX_COMMENTS)
            .map(
              (comment) =>
                `- **${comment.user?.login ?? 'unknown'}** (${comment.created_at}): ${truncate(comment.body, MAX_COMMENT_CHARS)}`,
            )
            .join('\n');

    const userPrompt = [
      `Analyze this GitHub issue for AI-generation likelihood.`,
      '',
      `Repo: ${fullName}`,
      `Issue: #${issue.number}`,
      `Author: ${issue.user.login}`,
      `Title: ${issue.title}`,
      `State: ${issue.state}`,
      `Labels: ${issue.labels.map((label) => label.name).join(', ') || 'none'}`,
      '',
      '### Description',
      truncate(issue.body ?? '_No description._', 3500),
      '',
      '### Recent comments',
      commentBlock,
      comments.length > MAX_COMMENTS ? `\n_…showing last ${MAX_COMMENTS} comments._` : '',
      '',
      'Return JSON:',
      '{"overallAiPercent":number,"confidence":"low"|"medium"|"high","sections":[{"name":"description"|"comments"|"title","aiLikelihoodPercent":number,"rationale":"..."}x3],"signals":["..."]}',
    ].join('\n');

    let raw: string;
    try {
      raw = await this.llm.client.generateReply({
        systemInstruction: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      });
    } catch (err) {
      throw toLlmError(err);
    }

    const parsed = parseAnalysisJson(raw);

    return {
      owner: target.owner,
      repo: target.repo,
      number: issue.number,
      author: issue.user.login,
      title: issue.title,
      htmlUrl: issue.html_url,
      overallAiPercent: Math.round(parsed.overallAiPercent),
      confidence: parsed.confidence,
      sections: parsed.sections.map((section) => ({
        name: section.name,
        aiLikelihoodPercent: Math.round(section.aiLikelihoodPercent),
        rationale: section.rationale,
      })),
      signals: parsed.signals,
      disclaimer: DISCLAIMER,
      analyzedAt: new Date().toISOString(),
    };
  }

  private assertRateLimit(userId: string): void {
    const now = Date.now();
    const windowMs = 60 * 60 * 1000;
    const maxChecks = 20;
    const bucket = this.rateLimits.get(userId);

    if (!bucket || now >= bucket.resetAt) {
      this.rateLimits.set(userId, { count: 1, resetAt: now + windowMs });
      return;
    }

    if (bucket.count >= maxChecks) {
      throw new AppError(429, 'Too many issue AI checks this hour. Try again later.', 'RATE_LIMITED');
    }

    bucket.count += 1;
  }
}

function parseAnalysisJson(raw: string): z.infer<typeof analysisSchema> {
  const trimmed = raw.trim();
  const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const jsonText = fenceMatch ? fenceMatch[1]!.trim() : trimmed;

  try {
    return analysisSchema.parse(JSON.parse(jsonText));
  } catch {
    throw new AppError(502, 'AI analysis returned an invalid response. Try again.', 'LLM_PARSE_ERROR');
  }
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function toLlmError(err: unknown): AppError {
  if (err instanceof LlmApiError) {
    return new AppError(err.statusCode, err.message, 'LLM_ERROR');
  }
  if (err instanceof AppError) return err;
  return new AppError(502, 'AI analysis failed', 'LLM_ERROR');
}
