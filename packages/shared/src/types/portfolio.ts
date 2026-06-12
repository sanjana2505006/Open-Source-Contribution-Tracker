import type { IssueItem } from './issues.js';

export type PortfolioInsights = {
  osctMember: true;
  stuckIssueCount: number;
  stuckIssues: IssueItem[];
};
