import type { StatsSummary, SyncStatus } from '@osct/shared';
import type { Env } from '../config/env.js';
import {
  GitHubApi,
  RateLimitError,
  type GitHubSearchIssue,
} from '../infrastructure/github/api.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { RepositoryRepository } from '../repositories/repositoryRepository.js';
import { SyncJobRepository } from '../repositories/syncJobRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';

function commitGithubId(sha: string): number {
  const hex = sha.replace(/[^a-f0-9]/gi, '').slice(0, 15);
  return Number.parseInt(hex, 16);
}

export class SyncService {
  private jobs: SyncJobRepository;
  private oauth: OAuthRepository;
  private users: UserRepository;
  private repos: RepositoryRepository;
  private contributions: ContributionRepository;
  private userRepos: UserRepositoryLinkRepository;

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

      const ghRepos = await api.listRepos();
      for (const ghRepo of ghRepos) {
        try {
          const repo = await this.repos.upsert(ghRepo);
          await this.userRepos.linkRepoOnly(userId, repo.id);
          reposSynced++;
        } catch {
          reposFailed++;
        }
        await this.jobs.updateProgress(jobId, reposSynced, reposFailed);
      }

      const prs = await api.searchPullRequests(user.username);
      for (const pr of prs) {
        await this.ingestPullRequest(userId, pr);
      }

      const events = await api.listPublicEvents(user.username);
      for (const event of events) {
        if (event.type !== 'PushEvent' || !event.payload.commits?.length) continue;

        const fullName = event.repo.name;
        let repo = await this.repos.findByFullName(fullName);
        if (!repo) continue;

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

      const status = reposFailed > 0 && reposSynced > 0 ? 'partial' : 'completed';
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

  private async ingestPullRequest(
    userId: string,
    pr: GitHubSearchIssue,
  ): Promise<void> {
    let repo = pr.repository
      ? await this.repos.upsert(pr.repository)
      : await this.resolveRepoFromUrl(pr.repository_url, pr);
    if (!repo) return;

    const isMerged = Boolean(pr.pull_request?.merged_at);
    const state = isMerged ? 'merged' : pr.state;

    await this.contributions.upsert({
      userId,
      repositoryId: repo.id,
      githubId: pr.id,
      type: 'pull_request',
      title: pr.title,
      state,
      isMerged,
      occurredAt: new Date(pr.created_at),
      htmlUrl: pr.html_url,
    });
  }

  private async resolveRepoFromUrl(
    repositoryUrl: string,
    pr: GitHubSearchIssue,
  ) {
    const match = repositoryUrl.match(/\/repos\/([^/]+)\/([^/]+)/);
    if (!match) return null;

    const fullName = `${match[1]}/${match[2]}`;
    const existing = await this.repos.findByFullName(fullName);
    if (existing) return existing;

    if (pr.repository) {
      return this.repos.upsert(pr.repository);
    }

    return null;
  }
}
