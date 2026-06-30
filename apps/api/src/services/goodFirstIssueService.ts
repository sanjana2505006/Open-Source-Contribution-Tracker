import type { GoodFirstIssueItem, GoodFirstIssueRecommendations, UserSkillProfile } from '@osct/shared';
import type { Env } from '../config/env.js';
import type { GitHubSearchIssue } from '../infrastructure/github/api.js';
import { GitHubApi } from '../infrastructure/github/api.js';
import { AppError } from '../middleware/errorHandler.js';
import { AnalyticsRepository } from '../repositories/analyticsRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';
import type pg from 'pg';

const GFI_LABELS =
  '(label:"good first issue" OR label:"good-first-issue" OR label:"good first issues")';

type ScoredIssue = GoodFirstIssueItem & { _sourceLanguage: string | null; _familiarRepo: boolean };

type SearchBatch = {
  items: GitHubSearchIssue[];
  language: string | null;
  familiarRepo: boolean;
};

export class GoodFirstIssueService {
  private analytics: AnalyticsRepository;
  private userRepos: UserRepositoryLinkRepository;
  private oauth: OAuthRepository;

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.analytics = new AnalyticsRepository(db);
    this.userRepos = new UserRepositoryLinkRepository(db);
    this.oauth = new OAuthRepository(db);
  }

  async recommend(userId: string): Promise<GoodFirstIssueRecommendations> {
    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new AppError(
        401,
        'GitHub token missing. Sign out and sign in again to load recommendations.',
        'UNAUTHORIZED',
      );
    }

    const range = this.defaultRange();
    const [languageRows, repos] = await Promise.all([
      this.analytics.getLanguageStats(userId, range),
      this.userRepos.listForUser(userId, 100),
    ]);

    const totalContributions = languageRows.reduce((sum, row) => sum + row.count, 0);
    if (totalContributions === 0 && repos.length === 0) {
      throw new AppError(
        400,
        'Sync from GitHub first so we can learn your languages and repos.',
        'VALIDATION_ERROR',
      );
    }

    const languages = buildLanguageProfile(languageRows, repos, totalContributions);

    const familiarRepos = repos
      .sort((a, b) => b.contributionCount - a.contributionCount)
      .slice(0, 6)
      .map((repo) => repo.fullName);

    const repoLanguageMap = new Map(
      repos.map((repo) => [repo.fullName.toLowerCase(), repo.primaryLanguage]),
    );

    const profile: UserSkillProfile = {
      languages,
      familiarRepos,
      totalContributions: totalContributions || repos.reduce((sum, repo) => sum + repo.contributionCount, 0),
    };

    const gh = new GitHubApi(token);
    const collected = new Map<number, ScoredIssue>();
    let failedSearches = 0;
    let usedBroadFallback = false;

    const targetedQueries: Array<{ query: string; language: string | null; familiarRepo: boolean }> = [
      ...languages.slice(0, 4).map((row) => ({
        query: `is:issue is:open ${GFI_LABELS} ${languageQualifier(row.language)}`,
        language: row.language,
        familiarRepo: false,
      })),
      ...familiarRepos.slice(0, 4).map((fullName) => ({
        query: `is:issue is:open ${GFI_LABELS} repo:${fullName}`,
        language: repoLanguageMap.get(fullName.toLowerCase()) ?? null,
        familiarRepo: true,
      })),
    ];

    const searchBatches = await runSearchesSequentially(gh, targetedQueries, () => {
      failedSearches += 1;
    });
    ingestBatches(collected, searchBatches, profile);

    if (collected.size === 0) {
      usedBroadFallback = true;
      const broadQueries = [
        { query: `is:issue is:open ${GFI_LABELS}`, language: null, familiarRepo: false },
        {
          query: 'is:issue is:open label:"help wanted" label:"good first issue"',
          language: null,
          familiarRepo: false,
        },
        ...languages.slice(0, 2).map((row) => ({
          query: `is:issue is:open label:"help wanted" ${languageQualifier(row.language)}`,
          language: row.language,
          familiarRepo: false,
        })),
      ];
      const broadBatches = await runSearchesSequentially(gh, broadQueries, () => {
        failedSearches += 1;
      });
      ingestBatches(collected, broadBatches, profile);
    }

    const items = [...collected.values()]
      .map((row) => ({
        ...row,
        matchScore: scoreIssue(row, profile),
        matchReason: '',
      }))
      .map((row) => ({ ...row, matchReason: buildMatchReason(row, profile) }))
      .sort((a, b) => b.matchScore - a.matchScore || b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 24)
      .map(stripInternal);

    const statusNote = buildStatusNote({
      itemCount: items.length,
      failedSearches,
      usedBroadFallback,
      languageCount: languages.length,
    });

    return {
      profile,
      items,
      searchedAt: new Date().toISOString(),
      statusNote,
    };
  }

  private defaultRange() {
    const to = new Date();
    const from = new Date(to);
    from.setFullYear(from.getFullYear() - 2);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }
}

function buildLanguageProfile(
  languageRows: { language: string; count: number }[],
  repos: { primaryLanguage: string | null; contributionCount: number }[],
  totalContributions: number,
) {
  if (languageRows.length > 0) {
    return languageRows.slice(0, 4).map((row) => ({
      language: row.language,
      count: row.count,
      sharePercent:
        totalContributions > 0 ? Math.round((row.count / totalContributions) * 100) : 0,
    }));
  }

  const counts = new Map<string, number>();
  for (const repo of repos) {
    if (!repo.primaryLanguage) continue;
    counts.set(
      repo.primaryLanguage,
      (counts.get(repo.primaryLanguage) ?? 0) + Math.max(repo.contributionCount, 1),
    );
  }

  const inferredTotal = [...counts.values()].reduce((sum, count) => sum + count, 0) || 1;
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([language, count]) => ({
      language,
      count,
      sharePercent: Math.round((count / inferredTotal) * 100),
    }));
}

function languageQualifier(language: string): string {
  if (/[\s#+]/.test(language)) {
    return `language:"${language.replace(/"/g, '')}"`;
  }
  return `language:${language}`;
}

async function runSearchesSequentially(
  gh: GitHubApi,
  queries: Array<{ query: string; language: string | null; familiarRepo: boolean }>,
  onFailure: () => void,
): Promise<SearchBatch[]> {
  const batches: SearchBatch[] = [];

  for (const entry of queries) {
    try {
      const items = await gh.searchIssuesPreview(entry.query, 30);
      batches.push({
        items,
        language: entry.language,
        familiarRepo: entry.familiarRepo,
      });
    } catch (err) {
      console.warn('Good-first-issue search failed:', entry.query, err);
      onFailure();
      batches.push({
        items: [],
        language: entry.language,
        familiarRepo: entry.familiarRepo,
      });
    }
  }

  return batches;
}

function ingestBatches(
  collected: Map<number, ScoredIssue>,
  batches: SearchBatch[],
  profile: UserSkillProfile,
) {
  for (const batch of batches) {
    for (const item of batch.items.slice(0, 20)) {
      if (collected.has(item.id)) continue;
      const mapped = mapIssue(item, batch.language, batch.familiarRepo, profile);
      collected.set(item.id, mapped);
    }
  }
}

function buildStatusNote(input: {
  itemCount: number;
  failedSearches: number;
  usedBroadFallback: boolean;
  languageCount: number;
}): string | null {
  if (input.itemCount > 0 && input.failedSearches === 0 && !input.usedBroadFallback) {
    return null;
  }

  if (input.itemCount === 0 && input.failedSearches > 0) {
    return 'GitHub search was temporarily unavailable. Wait a minute and refresh.';
  }

  if (input.itemCount === 0 && input.languageCount === 0) {
    return 'Sync from Overview so we can detect your languages from your repos.';
  }

  if (input.itemCount === 0) {
    return 'No labeled good-first issues matched your stack yet. Try syncing again after more contributions.';
  }

  if (input.usedBroadFallback) {
    return 'Expanded search beyond your exact repos to surface starter issues in your languages.';
  }

  if (input.failedSearches > 0) {
    return 'Some GitHub searches were skipped due to rate limits — showing partial results.';
  }

  return null;
}

function mapIssue(
  item: GitHubSearchIssue,
  sourceLanguage: string | null,
  familiarRepo: boolean,
  _profile: UserSkillProfile,
): ScoredIssue {
  const repositoryFullName =
    item.repository?.full_name ?? repoFullNameFromUrl(item.repository_url) ?? 'unknown/unknown';

  return {
    id: item.id,
    number: item.number,
    title: item.title,
    htmlUrl: item.html_url,
    repositoryFullName,
    repositoryUrl: `https://github.com/${repositoryFullName}`,
    language: sourceLanguage ?? item.repository?.language ?? null,
    labels: (item.labels ?? []).map((label) => label.name),
    updatedAt: item.updated_at,
    matchScore: 0,
    matchReason: '',
    _sourceLanguage: sourceLanguage ?? item.repository?.language ?? null,
    _familiarRepo: familiarRepo,
  };
}

function scoreIssue(issue: ScoredIssue, profile: UserSkillProfile): number {
  let score = 0;

  if (issue._familiarRepo) score += 55;

  const langRank = profile.languages.findIndex(
    (row) => row.language.toLowerCase() === (issue.language ?? '').toLowerCase(),
  );
  if (langRank === 0) score += 40;
  else if (langRank === 1) score += 28;
  else if (langRank === 2) score += 18;
  else if (langRank >= 0) score += 10;

  const updatedMs = new Date(issue.updatedAt).getTime();
  const ageDays = (Date.now() - updatedMs) / (1000 * 60 * 60 * 24);
  if (ageDays <= 14) score += 12;
  else if (ageDays <= 60) score += 6;

  if (issue.labels.some((label) => /help wanted/i.test(label))) score += 4;

  return score;
}

function buildMatchReason(issue: ScoredIssue, profile: UserSkillProfile): string {
  const parts: string[] = [];

  if (issue._familiarRepo) {
    parts.push('from a repo you already contribute to');
  }

  if (issue.language) {
    const lang = profile.languages.find(
      (row) => row.language.toLowerCase() === issue.language!.toLowerCase(),
    );
    if (lang) {
      parts.push(`matches your ${lang.language} work (${lang.sharePercent}% of contributions)`);
    } else {
      parts.push(`uses ${issue.language}`);
    }
  }

  if (parts.length === 0) {
    return 'Open good-first-issue label in your orbit — worth a look.';
  }

  return parts.join(' · ');
}

function repoFullNameFromUrl(repositoryUrl: string): string | null {
  const match = repositoryUrl.match(/repos\/([^/]+\/[^/]+)$/i);
  return match?.[1] ?? null;
}

function stripInternal(issue: ScoredIssue): GoodFirstIssueItem {
  const { _sourceLanguage: _a, _familiarRepo: _b, ...rest } = issue;
  return rest;
}
