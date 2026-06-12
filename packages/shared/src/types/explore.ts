import type { AnalyticsBundle, PullRequestStats } from './analytics.js';
import type { PortfolioInsights } from './portfolio.js';
import type { PublicPortfolioHighlights } from './portfolio.js';
import type { RepositorySummary, StatsSummary } from './sync.js';

export type ContributorProfile = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  profileUrl: string;
  stats: StatsSummary;
  repositories: RepositorySummary[];
  analytics: AnalyticsBundle;
  syncedAt: string;
};

export type WatchedContributor = {
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  stats: StatsSummary;
  syncedAt: string;
};

export type PublicProfile = ContributorProfile & {
  source: 'cache' | 'live';
  highlights?: PublicPortfolioHighlights;
  /** @deprecated Use highlights — stuck issues are no longer public */
  insights?: PortfolioInsights;
};
