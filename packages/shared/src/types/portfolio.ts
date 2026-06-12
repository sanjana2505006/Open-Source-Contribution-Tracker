import type { ContributionStreak } from './streak.js';

export type PublicPortfolioHighlights = {
  osctMember: true;
  streak: ContributionStreak | null;
};

/** @deprecated Stuck issues are private — not exposed on public portfolios. */
export type PortfolioInsights = {
  osctMember: true;
  stuckIssueCount: number;
  stuckIssues: never[];
};
