export type UserSkillLanguage = {
  language: string;
  count: number;
  sharePercent: number;
};

export type UserSkillProfile = {
  languages: UserSkillLanguage[];
  familiarRepos: string[];
  totalContributions: number;
};

export type GoodFirstIssueItem = {
  id: number;
  number: number;
  title: string;
  htmlUrl: string;
  repositoryFullName: string;
  repositoryUrl: string;
  language: string | null;
  labels: string[];
  updatedAt: string;
  matchScore: number;
  matchReason: string;
};

export type GoodFirstIssueRecommendations = {
  profile: UserSkillProfile;
  items: GoodFirstIssueItem[];
  searchedAt: string;
  /** Shown when searches partially failed or we widened the query. */
  statusNote?: string | null;
};
