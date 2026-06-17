import type { AgentContext, AgentSource } from '@osct/shared';
import type { Env } from '../config/env.js';
import {
  GitHubApi,
  type GitHubIssueComment,
  type GitHubIssueDetail,
  type GitHubPullRequestDetail,
} from '../infrastructure/github/api.js';
import { stuckDaysSince, stuckReason } from '../lib/stuckIssues.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import type pg from 'pg';

const MAX_BODY_CHARS = 4000;
const MAX_COMMENT_CHARS = 1200;

export type AgentContextBundle = {
  text: string;
  sources: AgentSource[];
};

export class AgentTools {
  private contributions: ContributionRepository;
  private oauth: OAuthRepository;

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.contributions = new ContributionRepository(db);
    this.oauth = new OAuthRepository(db);
  }

  async buildContext(userId: string, context?: AgentContext): Promise<AgentContextBundle> {
    const sections: string[] = [];
    const sources: AgentSource[] = [];

    const stuck = await this.contributions.listIssues(userId, {
      role: 'stuck',
      sort: 'stuck',
      limit: 8,
    });

    if (stuck.items.length > 0) {
      const lines = stuck.items.map((row) => {
        const roles = row.raw_metadata?.roles ?? [];
        const days = stuckDaysSince(row.raw_metadata, row.occurred_at);
        const reason = stuckReason(
          roles.filter(
            (role): role is 'assigned' | 'authored' | 'commented' =>
              role === 'assigned' || role === 'authored' || role === 'commented',
          ),
        );
        return `- ${row.full_name}#${parseIssueNumber(row.html_url) ?? '?'}: "${row.title}" (${days}d stuck — ${reason})`;
      });
      sections.push(`## Stuck issues in OSCT (no activity 30+ days)\n${lines.join('\n')}`);
      for (const row of stuck.items.slice(0, 3)) {
        sources.push({
          type: 'issue',
          label: `${row.full_name} — ${row.title}`,
          url: row.html_url,
        });
      }
    }

    const openIssues = await this.contributions.listIssues(userId, {
      status: 'open',
      sort: 'newest',
      limit: 5,
    });

    if (openIssues.items.length > 0) {
      const lines = openIssues.items.map(
        (row) =>
          `- ${row.full_name}#${parseIssueNumber(row.html_url) ?? '?'}: "${row.title}" [${(row.raw_metadata?.roles ?? []).join(', ')}]`,
      );
      sections.push(`## Recent open issues (synced)\n${lines.join('\n')}`);
    }

    const openPrs = await this.contributions.listPullRequests(userId, {
      status: 'open',
      sort: 'newest',
      limit: 5,
    });

    if (openPrs.items.length > 0) {
      const lines = openPrs.items.map(
        (row) => `- ${row.full_name}#${parsePullNumber(row.html_url) ?? '?'}: "${row.title}"`,
      );
      sections.push(`## Recent open pull requests (synced)\n${lines.join('\n')}`);
    }

    if (context?.type === 'issue' && context.owner && context.repo && context.number) {
      const focused = await this.fetchIssueContext(userId, context.owner, context.repo, context.number);
      if (focused) {
        sections.unshift(focused.text);
        sources.unshift(...focused.sources);
      }
    }

    if (context?.type === 'pull_request' && context.owner && context.repo && context.number) {
      const focused = await this.fetchPullRequestContext(
        userId,
        context.owner,
        context.repo,
        context.number,
      );
      if (focused) {
        sections.unshift(focused.text);
        sources.unshift(...focused.sources);
      }
    }

    if (sections.length === 0) {
      sections.push(
        'No synced issues or pull requests yet. Suggest the user sync from GitHub on the Issues or Overview page.',
      );
    }

    return {
      text: sections.join('\n\n'),
      sources: dedupeSources(sources),
    };
  }

  private async githubForUser(userId: string): Promise<GitHubApi | null> {
    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) return null;
    return new GitHubApi(token);
  }

  private async userHasRepoIssue(
    userId: string,
    fullName: string,
    issueNumber: number,
  ): Promise<boolean> {
    const { items } = await this.contributions.listIssues(userId, {
      repo: fullName,
      limit: 200,
    });
    return items.some((row) => parseIssueNumber(row.html_url) === issueNumber);
  }

  private async userHasRepoPullRequest(
    userId: string,
    fullName: string,
    prNumber: number,
  ): Promise<boolean> {
    const { items } = await this.contributions.listPullRequests(userId, {
      repo: fullName,
      limit: 200,
    });
    return items.some((row) => parsePullNumber(row.html_url) === prNumber);
  }

  private async fetchIssueContext(
    userId: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<AgentContextBundle | null> {
    const fullName = `${owner}/${repo}`;
    const inScope = await this.userHasRepoIssue(userId, fullName, number);
    if (!inScope) {
      return {
        text: `## Focus issue\nUser asked about ${fullName}#${number}, but it is not in their synced OSCT issue list. Answer using general open-source triage advice only.`,
        sources: [],
      };
    }

    const gh = await this.githubForUser(userId);
    if (!gh) {
      return {
        text: `## Focus issue\n${fullName}#${number} is synced in OSCT but live GitHub details are unavailable (missing token).`,
        sources: [{ type: 'issue', label: `${fullName}#${number}`, url: githubIssueUrl(owner, repo, number) }],
      };
    }

    let issue: GitHubIssueDetail;
    let comments: GitHubIssueComment[];
    try {
      [issue, comments] = await Promise.all([
        gh.getIssue(owner, repo, number),
        gh.listIssueComments(owner, repo, number),
      ]);
    } catch {
      return {
        text: `## Focus issue\nCould not load live GitHub data for ${fullName}#${number}.`,
        sources: [{ type: 'issue', label: `${fullName}#${number}`, url: githubIssueUrl(owner, repo, number) }],
      };
    }

    const commentBlock =
      comments.length === 0
        ? '_No comments yet._'
        : comments
            .slice(-8)
            .map(
              (comment) =>
                `- **${comment.user?.login ?? 'unknown'}** (${comment.created_at}): ${truncate(comment.body, MAX_COMMENT_CHARS)}`,
            )
            .join('\n');

    return {
      text: [
        `## Focus issue (live from GitHub)`,
        `- Repo: ${fullName}`,
        `- Number: #${issue.number}`,
        `- Title: ${issue.title}`,
        `- State: ${issue.state}`,
        `- Author: ${issue.user.login}`,
        `- Labels: ${issue.labels.map((label) => label.name).join(', ') || 'none'}`,
        `- Assignees: ${issue.assignees.map((user) => user.login).join(', ') || 'none'}`,
        `- Updated: ${issue.updated_at}`,
        '',
        '### Description',
        truncate(issue.body ?? '_No description._', MAX_BODY_CHARS),
        '',
        '### Recent comments',
        commentBlock,
      ].join('\n'),
      sources: [{ type: 'issue', label: `${fullName}#${issue.number}`, url: issue.html_url }],
    };
  }

  private async fetchPullRequestContext(
    userId: string,
    owner: string,
    repo: string,
    number: number,
  ): Promise<AgentContextBundle | null> {
    const fullName = `${owner}/${repo}`;
    const inScope = await this.userHasRepoPullRequest(userId, fullName, number);
    if (!inScope) {
      return {
        text: `## Focus pull request\n${fullName}#${number} is not in the user's synced PR list.`,
        sources: [],
      };
    }

    const gh = await this.githubForUser(userId);
    if (!gh) {
      return {
        text: `## Focus pull request\n${fullName}#${number} is synced but live GitHub details are unavailable.`,
        sources: [{ type: 'pull_request', label: `${fullName}#${number}`, url: githubPullUrl(owner, repo, number) }],
      };
    }

    let pr: GitHubPullRequestDetail;
    try {
      pr = await gh.getPullRequest(owner, repo, number);
    } catch {
      return {
        text: `## Focus pull request\nCould not load ${fullName}#${number} from GitHub.`,
        sources: [{ type: 'pull_request', label: `${fullName}#${number}`, url: githubPullUrl(owner, repo, number) }],
      };
    }

    return {
      text: [
        `## Focus pull request (live from GitHub)`,
        `- Repo: ${fullName}`,
        `- Number: #${pr.number}`,
        `- Title: ${pr.title}`,
        `- State: ${pr.state}${pr.merged_at ? ' (merged)' : ''}${pr.draft ? ' (draft)' : ''}`,
        `- Author: ${pr.user.login}`,
        `- Branch: ${pr.head.ref} → ${pr.base.ref}`,
        `- Changes: +${pr.additions} / -${pr.deletions}, ${pr.changed_files} files, ${pr.commits} commits`,
        '',
        '### Description',
        truncate(pr.body ?? '_No description._', MAX_BODY_CHARS),
      ].join('\n'),
      sources: [{ type: 'pull_request', label: `${fullName}#${pr.number}`, url: pr.html_url }],
    };
  }
}

export function contextRefFromAgentContext(context?: AgentContext): string | null {
  if (!context || context.type === 'general') return null;
  if (context.owner && context.repo && context.number) {
    return `${context.owner}/${context.repo}#${context.number}`;
  }
  return null;
}

export function parseIssueFromUrl(htmlUrl: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const match = htmlUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
  if (!match) return null;
  return { owner: match[1]!, repo: match[2]!, number: Number(match[3]) };
}

function parseIssueNumber(htmlUrl: string): number | null {
  return parseIssueFromUrl(htmlUrl)?.number ?? null;
}

function parsePullNumber(htmlUrl: string): number | null {
  const match = htmlUrl.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  return match ? Number(match[3]) : null;
}

function githubIssueUrl(owner: string, repo: string, number: number): string {
  return `https://github.com/${owner}/${repo}/issues/${number}`;
}

function githubPullUrl(owner: string, repo: string, number: number): string {
  return `https://github.com/${owner}/${repo}/pull/${number}`;
}

function truncate(text: string, max: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max)}…`;
}

function dedupeSources(sources: AgentSource[]): AgentSource[] {
  const seen = new Set<string>();
  return sources.filter((source) => {
    if (seen.has(source.url)) return false;
    seen.add(source.url);
    return true;
  });
}
