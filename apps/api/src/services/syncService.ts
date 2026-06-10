import type { StatsSummary, SyncStatus } from '@osct/shared';
import type { Env } from '../config/env.js';
import { GitHubApi, RateLimitError } from '../infrastructure/github/api.js';
import {
  GitHubGraphQL,
  graphRepoToGitHubRepo,
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
      await this.jobs.updateProgress(jobId, reposSynced, reposFailed);

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
      await this.jobs.updateProgress(jobId, reposSynced, reposFailed);

      const pullRequests = await gql.listAllPullRequests(user.username);
      let prCount = 0;

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

      const events = await api.listPublicEvents(user.username);
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

      await this.userRepos.rebuildFromContributions(userId);
      await this.journey.refreshMilestones(userId);

      const status = reposFailed > 0 ? 'partial' : 'completed';
      await this.jobs.complete(jobId, status, null, null);
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
}
