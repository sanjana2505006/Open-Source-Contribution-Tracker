export type ContributionTimelinePoint = {
  period: string;
  pullRequests: number;
  commits: number;
  total: number;
};

export type PullRequestStats = {
  open: number;
  closed: number;
  merged: number;
  total: number;
};

export type LanguageStat = {
  language: string;
  count: number;
};

export type AnalyticsRange = {
  from: string;
  to: string;
};

export type AnalyticsBundle = {
  range: AnalyticsRange;
  timeline: ContributionTimelinePoint[];
  pullRequests: PullRequestStats;
  languages: LanguageStat[];
};
