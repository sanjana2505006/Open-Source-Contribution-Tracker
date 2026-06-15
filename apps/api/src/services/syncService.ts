import type { StatsSummary, SyncStatus } from '@osct/shared';
import type { Env } from '../config/env.js';
import { GitHubApi, RateLimitError, type GitHubRepo, type GitHubSearchIssue } from '../infrastructure/github/api.js';
import {
  GitHubGraphQL,
  graphRepoToGitHubRepo,
  issueState,
  type GraphQLIssue,
  type GraphQLPullRequest,
} from '../infrastructure/github/graphql.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { RepositoryRepository } from '../repositories/repositoryRepository.js';
import { SyncJobRepository } from '../repositories/syncJobRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';
import { JourneyService } from './journeyService.js';
import { ExploreService } from './exploreService.js';

function prState(pr: GraphQLPullRequest): 'open' | 'closed' | 'merged' {
  if (pr.state === 'MERGED' || pr.merged) return 'merged';
  if (pr.state === 'OPEN') return 'open';
  return 'closed';
}

function repoFullNameFromUrl(repositoryUrl: string): string {
  return repositoryUrl.replace('https://api.github.com/repos/', '');
}

function stubGithubId(fullName: string): number {
  let hash = 0;
  for (let i = 0; i < fullName.length; i++) {
    hash = (Math.imul(31, hash) + fullName.charCodeAt(i)) >>> 0;
  }
  return (hash % 900_000_000) + 100_000_000;
}

function stubRepo(fullName: string): GitHubRepo {
  const slash = fullName.indexOf('/');
  const ownerLogin = fullName.slice(0, slash);
  const name = fullName.slice(slash + 1);

  return {
    id: stubGithubId(fullName),
    name,
    full_name: fullName,
    owner: { login: ownerLogin },
    description: null,
    language: null,
    stargazers_count: 0,
    fork: false,
    private: false,
    html_url: `https://github.com/${fullName}`,
    default_branch: null,
    pushed_at: null,
  };
}

export class SyncService {
  private jobs: SyncJobRepository;
  private oauth: OAuthRepository;
  private users: UserRepository;
  private repos: RepositoryRepository;
  private contributions: ContributionRepository;
  private userRepos: UserRepositoryLinkRepository;
  private journey: JourneyService;

  constructor(
    private env: Env,
    private db: import('pg').Pool,
  ) {
    this.jobs = new SyncJobRepository(db);
    this.oauth = new OAuthRepository(db);
    this.users = new UserRepository(db);
    this.repos = new RepositoryRepository(db);
    this.contributions = new ContributionRepository(db);
    this.userRepos = new UserRepositoryLinkRepository(db);
    this.journey = new JourneyService(db);
  }

  async getStatus(userId: string): Promise<SyncStatus | null> {
    await this.jobs.expireStaleRunning(userId, 1);
    return this.jobs.findLatest(userId);
  }

  async cancelSync(userId: string): Promise<void> {
    await this.jobs.cancelRunning(userId);
  }

  async getStats(userId: string): Promise<StatsSummary> {
    return this.userRepos.getStats(userId);
  }

  async startSync(userId: string): Promise<SyncStatus> {
    await this.jobs.expireStaleRunning(userId, 1);
    await this.jobs.cancelRunning(userId, 'Starting a new sync');

    const job = await this.jobs.create(userId);
    void this.runSync(userId, job.id);
    return job;
  }

  async syncIssuesOnly(userId: string): Promise<{ issueCount: number }> {
    await this.jobs.expireStaleRunning(userId, 1);
    await this.jobs.cancelRunning(userId, 'Starting issue-only sync');
    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new Error('No GitHub token — sign out and sign in again');
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const api = new GitHubApi(token);
    const gql = new GitHubGraphQL(token);
    const job = await this.jobs.create(userId);

    try {
      const issueCount = await this.syncAllIssues(userId, user.username, api, gql, job.id);
      await this.userRepos.rebuildFromContributions(userId);

      const message =
        issueCount > 0
          ? `Synced ${issueCount} issues from GitHub.`
          : 'No issues were saved — sign out and sign in again, then retry.';

      await this.jobs.complete(
        job.id,
        issueCount > 0 ? 'completed' : 'partial',
        message,
        null,
      );

      return { issueCount };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Issue sync failed';
      await this.jobs.complete(job.id, 'failed', message, null);
      throw err;
    }
  }

  private async runSync(userId: string, jobId: string): Promise<void> {
    let reposFailed = 0;

    try {
      const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
      if (!token) {
        await this.jobs.complete(jobId, 'failed', 'No GitHub token on file', null);
        return;
      }

      const user = await this.users.findById(userId);
      if (!user) {
        await this.jobs.complete(jobId, 'failed', 'User not found', null);
        return;
      }

      const api = new GitHubApi(token);
      const gql = new GitHubGraphQL(token);

      // Fetch PRs + repos in parallel — fast path so dashboard stats appear quickly.
      let pullRequests: GraphQLPullRequest[] = [];
      let contributedRepos: Awaited<ReturnType<GitHubGraphQL['listContributedRepositories']>> = [];
      let ownedRepos: GitHubRepo[] = [];

      const fetchResults = await Promise.allSettled([
        gql.listAllPullRequests(user.username),
        gql.listContributedRepositories(user.username),
        api.listRepos(),
      ]);

      if (fetchResults[0].status === 'fulfilled') {
        pullRequests = fetchResults[0].value;
      } else {
        console.error('Pull request fetch failed:', fetchResults[0].reason);
        reposFailed++;
      }

      if (fetchResults[1].status === 'fulfilled') {
        contributedRepos = fetchResults[1].value;
      } else {
        console.error('Contributed repositories fetch failed:', fetchResults[1].reason);
        reposFailed++;
      }

      if (fetchResults[2].status === 'fulfilled') {
        ownedRepos = fetchResults[2].value;
      } else {
        console.error('Owned repositories fetch failed:', fetchResults[2].reason);
        reposFailed++;
      }

      const prResult = await this.persistPullRequests(userId, pullRequests, jobId);
      reposFailed += prResult.failed;

      const repoResult = await this.persistRepositories(
        userId,
        contributedRepos,
        ownedRepos,
        jobId,
        prResult.count,
      );
      reposFailed += repoResult.failed;

      const itemsSynced = prResult.count + repoResult.count;
      await this.jobs.updateProgress(jobId, itemsSynced, reposFailed);

      let commitRows = 0;
      try {
        commitRows = await this.syncRecentCommits(userId, user.username, api, gql, jobId);
      } catch (commitErr) {
        console.error(`Commit sync failed for ${user.username}:`, commitErr);
      }

      await this.userRepos.rebuildFromContributions(userId);
      await this.journey.refreshMilestones(userId);

      let completionMessage: string;
      let status: SyncStatus['status'];

      if (prResult.count === 0 && repoResult.count === 0) {
        completionMessage =
          fetchResults[0].status === 'rejected'
            ? 'Could not fetch PRs from GitHub — try again in a few minutes.'
            : 'No PRs or repos found — check your GitHub account has public activity.';
        status = 'failed';
      } else if (reposFailed > 0) {
        completionMessage = `Synced ${prResult.count} PRs, ${repoResult.count} repos, ${commitRows} commits (some items skipped). Issues syncing in background.`;
        status = 'partial';
      } else {
        completionMessage = `Synced ${prResult.count} PRs, ${repoResult.count} repos, ${commitRows} commits. Issues syncing in background.`;
        status = 'completed';
      }

      await this.jobs.complete(jobId, status, completionMessage, null);

      void new ExploreService(this.env, this.db).publishFromUser(userId);

      // Issues are slow (Search API) — finish PRs/repos/commits first, then backfill issues.
      void this.runBackgroundSync(userId, user.username, api, gql).catch((err) => {
        console.error('Background sync failed:', err);
      });
    } catch (err) {
      const resetAt = err instanceof RateLimitError ? err.resetAt : null;
      const message =
        err instanceof Error ? err.message : 'Sync failed unexpectedly';
      await this.jobs.complete(jobId, 'failed', message, resetAt);
    }
  }

  private async persistPullRequests(
    userId: string,
    pullRequests: GraphQLPullRequest[],
    jobId: string,
  ): Promise<{ count: number; failed: number }> {
    let count = 0;
    let failed = 0;

    for (const pr of pullRequests) {
      try {
        const repo = await this.repos.upsert(graphRepoToGitHubRepo(pr.repository));
        await this.userRepos.linkRepoOnly(userId, repo.id);

        const state = prState(pr);
        await this.contributions.upsert({
          userId,
          repositoryId: repo.id,
          githubId: pr.databaseId,
          type: 'pull_request',
          title: pr.title,
          state,
          isMerged: state === 'merged',
          occurredAt: new Date(pr.createdAt),
          htmlUrl: pr.url,
        });
        count++;
        if (count % 25 === 0) {
          await this.jobs.updateProgress(jobId, count, failed);
        }
      } catch {
        failed++;
      }
    }

    return { count, failed };
  }

  private async persistRepositories(
    userId: string,
    contributedRepos: Awaited<ReturnType<GitHubGraphQL['listContributedRepositories']>>,
    ownedRepos: GitHubRepo[],
    jobId: string,
    progressBase: number,
  ): Promise<{ count: number; failed: number }> {
    let count = 0;
    let failed = 0;

    for (const node of contributedRepos) {
      try {
        const repo = await this.repos.upsert(graphRepoToGitHubRepo(node));
        await this.userRepos.linkRepoOnly(userId, repo.id);
        count++;
      } catch {
        failed++;
      }
    }

    for (const ghRepo of ownedRepos) {
      try {
        const repo = await this.repos.upsert(ghRepo);
        await this.userRepos.linkRepoOnly(userId, repo.id);
        count++;
      } catch {
        failed++;
      }
    }

    if (count > 0) {
      await this.jobs.updateProgress(jobId, progressBase + count, failed);
    }

    return { count, failed };
  }

  private async runBackgroundSync(
    userId: string,
    username: string,
    api: GitHubApi,
    gql: GitHubGraphQL,
  ): Promise<void> {
    const issueCount = await this.syncAllIssues(userId, username, api, gql).catch((err) => {
      console.error(`Issue background sync failed for ${username}:`, err);
      return 0;
    });

    await this.userRepos.rebuildFromContributions(userId);
    await this.journey.refreshMilestones(userId);
    void new ExploreService(this.env, this.db).publishFromUser(userId);
    console.log(`Background sync for ${username}: ${issueCount} issues`);
  }

  private async syncAllIssues(
    userId: string,
    username: string,
    api: GitHubApi,
    gql: GitHubGraphQL,
    jobId?: string,
  ): Promise<number> {
    let issueCount = 0;

    const phases: Array<{
      label: string;
      role: 'assigned' | 'authored' | 'commented';
      fetchSearch: () => Promise<GitHubSearchIssue[]>;
      fetchGraphql?: () => Promise<GraphQLIssue[]>;
    }> = [
      {
        label: 'assigned',
        role: 'assigned',
        fetchSearch: () => api.searchIssuesAssigned(username),
        fetchGraphql: () => gql.listViewerAssignedIssues(),
      },
      {
        label: 'authored',
        role: 'authored',
        fetchSearch: () => api.searchIssuesAuthored(username),
        fetchGraphql: () => gql.listAuthoredIssues(username),
      },
      {
        label: 'commented',
        role: 'commented',
        fetchSearch: () => api.searchIssuesCommented(username),
      },
    ];

    for (const phase of phases) {
      try {
        const result = await this.syncSearchIssues(
          userId,
          api,
          await phase.fetchSearch(),
          phase.role,
          jobId,
          issueCount,
        );
        issueCount += result.count;
        console.log(
          `Issue sync (${phase.label}/search): saved ${result.count}, failed ${result.failed}`,
        );
        if (result.count === 0 && phase.fetchGraphql) {
          throw new Error(`No ${phase.label} issues saved from search`);
        }
      } catch (searchErr) {
        console.error(`${phase.label} issue search sync failed:`, searchErr);
        if (!phase.fetchGraphql || phase.role === 'commented') continue;

        try {
          const result = await this.syncGraphqlIssues(
            userId,
            await phase.fetchGraphql(),
            phase.role,
            jobId,
            issueCount,
          );
          issueCount += result.count;
          console.log(
            `Issue sync (${phase.label}/graphql): saved ${result.count}, failed ${result.failed}`,
          );
        } catch (graphqlErr) {
          console.error(`${phase.label} issue GraphQL sync failed:`, graphqlErr);
        }
      }
    }

    console.log(`Issue sync total for ${username}: ${issueCount}`);
    return issueCount;
  }

  private async syncRecentCommits(
    userId: string,
    username: string,
    api: GitHubApi,
    gql: GitHubGraphQL,
    _jobId?: string,
  ): Promise<number> {
    const total = await this.fetchCommitTotal(username, gql, api);

    await this.contributions.deleteByUserAndType(userId, 'commit');

    if (total > 0) {
      await this.persistCommitSummary(userId, total);
      console.log(`Commit sync for ${username}: stored total ${total}`);
    } else {
      console.log(`Commit sync for ${username}: GitHub reported 0 commits in the last 3 years`);
    }

    return total;
  }

  private async fetchCommitTotal(
    username: string,
    gql: GitHubGraphQL,
    api: GitHubApi,
  ): Promise<number> {
    for (const asViewer of [true, false]) {
      try {
        const total = await gql.getTotalCommitContributions(username, 3, asViewer);
        if (total > 0) {
          console.log(
            `GitHub totalCommitContributions for ${username} (viewer=${asViewer}): ${total}`,
          );
          return total;
        }
      } catch (err) {
        console.error(
          `totalCommitContributions failed for ${username} (viewer=${asViewer}):`,
          err,
        );
      }
    }

    const pushTotal = await this.countCommitsFromPushEvents(username, api);
    if (pushTotal > 0) {
      console.log(`Push-event commit estimate for ${username}: ${pushTotal}`);
    }
    return pushTotal;
  }

  private async countCommitsFromPushEvents(username: string, api: GitHubApi): Promise<number> {
    const events = await api.listUserEvents(username);
    let total = 0;

    for (const event of events) {
      if (event.type !== 'PushEvent') continue;
      total +=
        event.payload.commits?.length ??
        event.payload.distinct_size ??
        event.payload.size ??
        0;
    }

    return total;
  }

  /** Last-resort: store GitHub's totalCommitContributions when row-level sync returns nothing. */
  private async persistCommitSummary(userId: string, totalCommits: number): Promise<void> {
    const repos = await this.userRepos.listForUser(userId, 1);
    if (!repos.length) return;

    await this.contributions.upsert({
      userId,
      repositoryId: repos[0]!.id,
      githubId: 1,
      type: 'commit',
      title: 'Commits (last 12 months)',
      state: null,
      isMerged: null,
      occurredAt: new Date(),
      htmlUrl: repos[0]!.htmlUrl,
      commitCount: totalCommits,
    });
  }

  private async syncGraphqlIssues(
    userId: string,
    issues: GraphQLIssue[],
    role: 'assigned' | 'authored',
    jobId?: string,
    progressBase = 0,
  ): Promise<{ count: number; failed: number }> {
    let count = 0;
    let failed = 0;

    for (const issue of issues) {
      try {
        if (!issue.databaseId) {
          failed++;
          continue;
        }

        const repo = await this.repos.upsert(graphRepoToGitHubRepo(issue.repository));
        await this.userRepos.linkRepoOnly(userId, repo.id);

        await this.contributions.upsert({
          userId,
          repositoryId: repo.id,
          githubId: issue.databaseId,
          type: 'issue',
          title: issue.title,
          state: issueState(issue),
          isMerged: null,
          occurredAt: new Date(issue.createdAt),
          htmlUrl: issue.url,
          roles: [role],
          createdAt: new Date(issue.createdAt),
          updatedAt: new Date(issue.updatedAt),
        });
        count++;
        if (jobId && count % 25 === 0) {
          await this.jobs.updateProgress(jobId, progressBase + count, failed);
        }
      } catch {
        failed++;
      }
    }

    return { count, failed };
  }

  private async syncSearchIssues(
    userId: string,
    api: GitHubApi,
    issues: GitHubSearchIssue[],
    role: 'assigned' | 'authored' | 'commented',
    jobId?: string,
    progressBase = 0,
  ): Promise<{ count: number; failed: number }> {
    let count = 0;
    let failed = 0;

    const repoCache = new Map<string, Awaited<ReturnType<RepositoryRepository['upsert']>>>();
    const uniqueFullNames = [
      ...new Set(issues.map((issue) => repoFullNameFromUrl(issue.repository_url))),
    ];

    for (const fullName of uniqueFullNames) {
      try {
        let repo = await this.repos.findByFullName(fullName);
        if (!repo) {
          try {
            repo = await this.repos.upsert(await api.fetchRepo(fullName));
          } catch {
            repo = await this.repos.upsert(stubRepo(fullName));
          }
        }
        repoCache.set(fullName, repo);
      } catch (err) {
        console.error(`Could not cache repo ${fullName}:`, err);
      }
    }

    for (const issue of issues) {
      try {
        const fullName = repoFullNameFromUrl(issue.repository_url);
        const repo = repoCache.get(fullName);
        if (!repo) {
          failed++;
          continue;
        }

        await this.userRepos.linkRepoOnly(userId, repo.id);

        await this.contributions.upsert({
          userId,
          repositoryId: repo.id,
          githubId: issue.id,
          type: 'issue',
          title: issue.title,
          state: issue.state,
          isMerged: null,
          occurredAt: new Date(issue.created_at),
          htmlUrl: issue.html_url,
          roles: [role],
          createdAt: new Date(issue.created_at),
          updatedAt: new Date(issue.updated_at),
        });
        count++;
        if (jobId && count % 25 === 0) {
          await this.jobs.updateProgress(jobId, progressBase + count, failed);
        }
      } catch (err) {
        if (failed === 0) {
          console.error(`Issue upsert failed (${role}, ${issue.html_url}):`, err);
        }
        failed++;
      }
    }

    return { count, failed };
  }
}
