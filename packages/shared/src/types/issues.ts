export type IssueRole = 'assigned' | 'authored' | 'commented';

export type IssueRoleFilter = 'all' | IssueRole | 'stuck';

export type IssueStatusFilter = 'all' | 'open' | 'closed';

export type IssueItem = {
  id: string;
  title: string;
  state: 'open' | 'closed' | null;
  occurredAt: string;
  htmlUrl: string;
  repositoryFullName: string;
  roles: IssueRole[];
  stuckDays?: number;
  stuckReason?: string;
};

export type IssueCounts = {
  all: number;
  open: number;
  closed: number;
  assigned: number;
  authored: number;
  commented: number;
  stuck: number;
};

export type IssueList = {
  items: IssueItem[];
  total: number;
  repository: string | null;
  role: IssueRoleFilter;
  status: IssueStatusFilter;
  counts: IssueCounts;
};
