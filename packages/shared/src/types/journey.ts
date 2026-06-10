export type MilestoneType =
  | 'account_linked'
  | 'first_contribution'
  | 'first_pull_request'
  | 'first_merged_pr'
  | 'tenth_pr'
  | 'hundredth_contribution'
  | 'custom';

export type MilestoneItem = {
  id: string;
  type: MilestoneType;
  title: string;
  description: string | null;
  occurredAt: string;
  htmlUrl: string | null;
  repositoryFullName: string | null;
};

export type JourneyBundle = {
  milestones: MilestoneItem[];
  highlights: {
    firstPullRequest: MilestoneItem | null;
    firstMergedPr: MilestoneItem | null;
  };
};
