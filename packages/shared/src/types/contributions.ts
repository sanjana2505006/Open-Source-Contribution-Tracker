export type PullRequestItem = {
  id: string;
  title: string;
  state: 'open' | 'closed' | 'merged' | null;
  isMerged: boolean;
  occurredAt: string;
  htmlUrl: string;
  repositoryFullName: string;
};

export type PullRequestList = {
  items: PullRequestItem[];
  total: number;
  repository: string | null;
};
