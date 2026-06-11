import type { StatsSummary, SyncStatus } from '@osct/shared';
import type { Env } from '../config/env.js';
import { GitHubApi, RateLimitError, type GitHubSearchIssue } from '../infrastructure/github/api.js';
import {
  GitHubGraphQL,
  contributionGithubId,
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

function commitGithubId(sha: string): number {
  const hex = sha.replace(/[^a-f0-9]/gi, '').slice(0, 15);
  return Number.parseInt(hex, 16);
}

function prState(pr: GraphQLPullRequest): 'open' | 'closed' | 'merged' {
  if (pr.state === 'MERGED' || pr.merged) return 'merged';
  if (pr.state === 'OPEN') return 'open';
  return 'closed';
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
    db: import('pg').Pool,
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
    return this.jobs.findLatest(userId);
  }

  async getStats(userId: string): Promise<StatsSummary> {
    return this.userRepos.getStats(userId);
  }

  async startSync(userId: string): Promise<SyncStatus> {
    const running = await this.jobs.findRunning(userId);
    if (running) return running;

    const job = await this.jobs.create(userId);
    void this.runSync(userId, job.id);
    return job;
  }

  private async runSync(userId: string, jobId: string): Promise<void> {
    let reposSynced = 0;
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

      // Sync issues first — they are easy to miss if PR/repo phases fail or hit rate limits.
      const issueCount = await this.syncAllIssues(
        userId,
        user.username,
        api,
        gql,
        jobId,
      );
      reposSynced += issueCount;
      await this.jobs.updateProgress(jobId, reposSynced, reposFailed);

      try {
        const contributedRepos = await gql.listContributedRepositories(user.username);
        for (const node of contributedRepos) {
          try {
            const repo = await this.repos.upsert(graphRepoToGitHubRepo(node));
            await this.userRepos.linkRepoOnly(userId, repo.id);
            reposSynced++;
          } catch {
            reposFailed++;
          }
        }
      } catch (err) {
        console.error('Contributed repositories sync failed:', err);
        reposFailed++;
      }
      await this.jobs.updateProgress(jobId, reposSynced, reposFailed);

      try {
        const ownedRepos = await api.listRepos();
        for (const ghRepo of ownedRepos) {
          try {
            const repo = await this.repos.upsert(ghRepo);
            await this.userRepos.linkRepoOnly(userId, repo.id);
            reposSynced++;
          } catch {
            reposFailed++;
          }
        }
      } catch (err) {
        console.error('Owned repositories sync failed:', err);
        reposFailed++;
      }
      await this.jobs.updateProgress(jobId, reposSynced, reposFailed);

      let prCount = 0;
      try {
        const pullRequests = await gql.listAllPullRequests(user.username);

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
            prCount++;
            if (prCount % 25 === 0) {
              await this.jobs.updateProgress(jobId, reposSynced + prCount, reposFailed);
            }
          } catch {
            reposFailed++;
          }
        }
      } catch (err) {
        console.error('Pull request sync failed:', err);
        reposFailed++;
      }

      reposSynced += prCount;

      try {
        const events = await api.listUserEvents(user.username);
        for (const event of events) {
          if (event.type !== 'PushEvent' || !event.payload.commits?.length) continue;

          const fullName = event.repo.name;
          let repo = await this.repos.findByFullName(fullName);
          if (!repo) {
            try {
              repo = await this.repos.upsert(await api.fetchRepo(fullName));
              await this.userRepos.linkRepoOnly(userId, repo.id);
            } catch {
              continue;
            }
          }

          for (const commit of event.payload.commits) {
            await this.contributions.upsert({
              userId,
              repositoryId: repo.id,
              githubId: commitGithubId(commit.sha),
              type: 'commit',
              title: commit.message.split('\n')[0] ?? commit.message,
              state: null,
              isMerged: null,
              occurredAt: new Date(event.created_at),
              htmlUrl: `https://github.com/${fullName}/commit/${commit.sha}`,
            });
          }
        }
      } catch {
        reposFailed++;
      }

      try {
        const commitContributions = await gql.listCommitContributions(user.username);
        for (const contribution of commitContributions) {
          try {
            const repo = await this.repos.upsert(graphRepoToGitHubRepo(contribution.repository));
            await this.userRepos.linkRepoOnly(userId, repo.id);

            await this.contributions.upsert({
              userId,
              repositoryId: repo.id,
              githubId: contributionGithubId(
                contribution.repository.databaseId,
                contribution.occurredAt,
              ),
              type: 'commit',
              title:
                contribution.commitCount === 1
                  ? 'Commit'
                  : `${contribution.commitCount} commits`,
              state: null,
              isMerged: null,
              occurredAt: new Date(contribution.occurredAt),
              htmlUrl: `https://github.com${contribution.resourcePath}`,
              commitCount: contribution.commitCount,
            });
          } catch {
            reposFailed++;
          }
        }
      } catch {
        reposFailed++;
      }

      await this.userRepos.rebuildFromContributions(userId);
      await this.journey.refreshMilestones(userId);

      let completionMessage: string | null = null;
      if (issueCount === 0) {
        completionMessage =
          'Sync finished but no issues were saved. Try signing out and back in, then sync again.';
        reposFailed++;
      }

      const status =
        reposFailed > 0 ? 'partial' : issueCount === 0 ? 'partial' : 'completed';
      await this.jobs.complete(jobId, status, completionMessage, null);
    } catch (err) {
      const resetAt = err instanceof RateLimitError ? err.resetAt : null;
      const message =
        err instanceof Error ? err.message : 'Sync failed unexpectedly';
      await this.jobs.complete(
        jobId,
        reposSynced > 0 ? 'partial' : 'failed',
        message,
        resetAt,
      );
    }
  }

  private async syncAllIssues(
    userId: string,
    username: string,
    api: GitHubApi,
    gql: GitHubGraphQL,
    jobId: string,
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

  private async syncGraphqlIssues(
    userId: string,
    issues: GraphQLIssue[],
    role: 'assigned' | 'authored',
    jobId: string,
    progressBase: number,
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
        if (count % 25 === 0) {
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
    jobId: string,
    progressBase: number,
  ): Promise<{ count: number; failed: number }> {
    let count = 0;
    let failed = 0;

    for (const issue of issues) {
      try {
        const fullName = issue.repository_url.replace('https://api.github.com/repos/', '');
        let repo = await this.repos.findByFullName(fullName);
        if (!repo) {
          repo = await this.repos.upsert(await api.fetchRepo(fullName));
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
        if (count % 25 === 0) {
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
