import type { ContributorProfile } from '@osct/shared';
import type { Env } from '../config/env.js';
import { GitHubApi, RateLimitError } from '../infrastructure/github/api.js';
import { GitHubGraphQL, graphRepoToGitHubRepo } from '../infrastructure/github/graphql.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { ContributorCacheRepository } from '../repositories/contributorCacheRepository.js';
import { WatchlistRepository } from '../repositories/watchlistRepository.js';
import {
  buildAnalyticsBundle,
  buildRepositorySummaries,
  buildStats,
} from './contributionAnalytics.js';

export class ExploreService {
  private oauth: OAuthRepository;
  private cache: ContributorCacheRepository;
  private watchlist: WatchlistRepository;

  constructor(
    private env: Env,
    db: import('pg').Pool,
  ) {
    this.oauth = new OAuthRepository(db);
    this.cache = new ContributorCacheRepository(db);
    this.watchlist = new WatchlistRepository(db);
  }

  private async getToken(viewerUserId: string): Promise<string> {
    const token = await this.oauth.getAccessToken(viewerUserId, this.env.SESSION_SECRET);
    if (!token) throw new Error('Sign in required to use GitHub API');
    return token;
  }

  async lookup(viewerUserId: string, username: string): Promise<ContributorProfile> {
    const normalized = username.trim().replace(/^@/, '').toLowerCase();
    if (!/^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/i.test(normalized)) {
      throw new Error('Invalid GitHub username');
    }

    const token = await this.getToken(viewerUserId);
    const gql = new GitHubGraphQL(token);
    const api = new GitHubApi(token);

    const profile = await gql.fetchUserProfile(normalized);
    if (!profile) {
      throw new Error(`GitHub user "${normalized}" not found`);
    }

    const [contributedRepos, pullRequests, events] = await Promise.all([
      gql.listContributedRepositories(normalized),
      gql.listAllPullRequests(normalized),
      api.listPublicEvents(normalized),
    ]);

    let commitCount = 0;
    for (const event of events) {
      if (event.type === 'PushEvent' && event.payload.commits?.length) {
        commitCount += event.payload.commits.length;
      }
    }

    const repoNames = new Set<string>();
    for (const repo of contributedRepos) repoNames.add(repo.nameWithOwner);
    for (const pr of pullRequests) repoNames.add(pr.repository.nameWithOwner);

    const repositories = buildRepositorySummaries(pullRequests);
    for (const node of contributedRepos) {
      const gh = graphRepoToGitHubRepo(node);
      if (!repositories.some((r) => r.fullName === gh.full_name)) {
        repositories.push({
          id: String(gh.id),
          fullName: gh.full_name,
          primaryLanguage: gh.language,
          htmlUrl: gh.html_url,
          contributionCount: 0,
          lastContributedAt: gh.pushed_at,
        });
      }
    }
    repositories.sort(
      (a, b) =>
        (b.lastContributedAt ? Date.parse(b.lastContributedAt) : 0) -
        (a.lastContributedAt ? Date.parse(a.lastContributedAt) : 0),
    );

    const result: ContributorProfile = {
      username: profile.login,
      displayName: profile.name,
      avatarUrl: profile.avatarUrl,
      profileUrl: profile.url,
      stats: buildStats(repoNames.size, pullRequests, commitCount),
      repositories,
      analytics: buildAnalyticsBundle(pullRequests, events),
      syncedAt: new Date().toISOString(),
    };

    await this.cache.upsert(result, profile.databaseId);
    return result;
  }

  async watch(viewerUserId: string, username: string): Promise<ContributorProfile> {
    const profile = await this.lookup(viewerUserId, username);
    const cacheId = await this.cache.getIdByUsername(profile.username);
    if (cacheId) await this.watchlist.add(viewerUserId, cacheId);
    return profile;
  }

  async unwatch(viewerUserId: string, username: string): Promise<void> {
    const removed = await this.watchlist.remove(viewerUserId, username);
    if (!removed) throw new Error('Not on your watchlist');
  }

  listWatched(viewerUserId: string) {
    return this.watchlist.list(viewerUserId);
  }

  async getCached(username: string): Promise<ContributorProfile | null> {
    return this.cache.findByUsername(username.replace(/^@/, '').toLowerCase());
  }
}

export { RateLimitError };
