import type {
  AnalyticsBundle,
  ContributionTimelinePoint,
  LanguageStat,
  PullRequestStats,
  RepositorySummary,
  StatsSummary,
} from '@osct/shared';
import type { GraphQLPullRequest } from '../infrastructure/github/graphql.js';
import type { GitHubEvent } from '../infrastructure/github/api.js';

function prState(pr: GraphQLPullRequest): 'open' | 'closed' | 'merged' {
  if (pr.state === 'MERGED' || pr.merged) return 'merged';
  if (pr.state === 'OPEN') return 'open';
  return 'closed';
}

export function buildPullRequestStats(prs: GraphQLPullRequest[]): PullRequestStats {
  let open = 0;
  let closed = 0;
  let merged = 0;

  for (const pr of prs) {
    const state = prState(pr);
    if (state === 'open') open++;
    else if (state === 'merged') merged++;
    else closed++;
  }

  return { open, closed, merged, total: prs.length };
}

export function buildTimeline(
  prs: GraphQLPullRequest[],
  commitDates: Date[],
): ContributionTimelinePoint[] {
  const buckets = new Map<string, { pullRequests: number; commits: number }>();

  for (const pr of prs) {
    const key = pr.createdAt.slice(0, 7) + '-01';
    const b = buckets.get(key) ?? { pullRequests: 0, commits: 0 };
    b.pullRequests++;
    buckets.set(key, b);
  }

  for (const date of commitDates) {
    const key = date.toISOString().slice(0, 7) + '-01';
    const b = buckets.get(key) ?? { pullRequests: 0, commits: 0 };
    b.commits++;
    buckets.set(key, b);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([period, counts]) => ({
      period,
      pullRequests: counts.pullRequests,
      commits: counts.commits,
      total: counts.pullRequests + counts.commits,
    }));
}

export function buildLanguageStats(prs: GraphQLPullRequest[]): LanguageStat[] {
  const counts = new Map<string, number>();

  for (const pr of prs) {
    const lang = pr.repository.primaryLanguage?.name;
    if (!lang) continue;
    counts.set(lang, (counts.get(lang) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([language, count]) => ({ language, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export function buildRepositorySummaries(
  prs: GraphQLPullRequest[],
): RepositorySummary[] {
  const map = new Map<
    string,
    {
      id: string;
      fullName: string;
      primaryLanguage: string | null;
      htmlUrl: string;
      count: number;
      lastAt: Date | null;
    }
  >();

  for (const pr of prs) {
    const repo = pr.repository;
    const existing = map.get(repo.nameWithOwner);
    const occurred = new Date(pr.createdAt);

    if (existing) {
      existing.count++;
      if (!existing.lastAt || occurred > existing.lastAt) existing.lastAt = occurred;
    } else {
      map.set(repo.nameWithOwner, {
        id: String(repo.databaseId),
        fullName: repo.nameWithOwner,
        primaryLanguage: repo.primaryLanguage?.name ?? null,
        htmlUrl: repo.url,
        count: 1,
        lastAt: occurred,
      });
    }
  }

  return [...map.values()]
    .sort((a, b) => (b.lastAt?.getTime() ?? 0) - (a.lastAt?.getTime() ?? 0))
    .map((r) => ({
      id: r.id,
      fullName: r.fullName,
      primaryLanguage: r.primaryLanguage,
      htmlUrl: r.htmlUrl,
      contributionCount: r.count,
      lastContributedAt: r.lastAt?.toISOString() ?? null,
    }));
}

export function buildStats(
  repoCount: number,
  prs: GraphQLPullRequest[],
  commitCount: number,
): StatsSummary {
  return {
    repositories: repoCount,
    pullRequests: prs.length,
    commits: commitCount,
  };
}

export function buildAnalyticsBundle(
  prs: GraphQLPullRequest[],
  events: GitHubEvent[],
): AnalyticsBundle {
  const commitDates: Date[] = [];
  for (const event of events) {
    if (event.type === 'PushEvent' && event.payload.commits?.length) {
      commitDates.push(new Date(event.created_at));
    }
  }

  const now = new Date();
  const yearAgo = new Date(now);
  yearAgo.setFullYear(yearAgo.getFullYear() - 1);

  return {
    range: {
      from: yearAgo.toISOString().slice(0, 10),
      to: now.toISOString().slice(0, 10),
    },
    timeline: buildTimeline(prs, commitDates),
    pullRequests: buildPullRequestStats(prs),
    languages: buildLanguageStats(prs),
  };
}
