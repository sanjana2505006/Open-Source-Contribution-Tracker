export type PullRequestStatusFilter = 'all' | 'open' | 'merged' | 'closed';

export type PullRequestItem = {
  id: string;
  title: string;
  state: 'open' | 'closed' | 'merged' | null;
  isMerged: boolean;
  occurredAt: string;
  htmlUrl: string;
  repositoryFullName: string;
};

export type PullRequestCounts = {
  all: number;
  open: number;
  merged: number;
  closed: number;
};

export type PullRequestList = {
  items: PullRequestItem[];
  total: number;
  repository: string | null;
  status: PullRequestStatusFilter;
  counts: PullRequestCounts;
};
