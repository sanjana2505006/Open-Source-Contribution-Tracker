export type SyncJobStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'partial';

export type SyncStatus = {
  id: string;
  status: SyncJobStatus;
  reposSynced: number;
  reposFailed: number;
  startedAt: string | null;
  completedAt: string | null;
  errorMessage: string | null;
};

export type StatsSummary = {
  repositories: number;
  pullRequests: number;
  commits: number;
};

export type RepositorySummary = {
  id: string;
  fullName: string;
  primaryLanguage: string | null;
  htmlUrl: string;
  contributionCount: number;
  lastContributedAt: string | null;
};
