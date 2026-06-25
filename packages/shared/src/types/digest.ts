import type { IssueRole } from './issues.js';

export type DigestIssueItem = {
  id: string;
  title: string;
  repositoryFullName: string;
  htmlUrl: string;
  issueNumber: number | null;
  stuckDays: number;
  stuckReason: string;
  roles: IssueRole[];
};

export type WeeklyDigestGroup = {
  reason: string;
  count: number;
  issues: DigestIssueItem[];
};

export type WeeklyDigest = {
  weekLabel: string;
  generatedAt: string;
  stuckTotal: number;
  summary: string;
  topPriorities: DigestIssueItem[];
  groups: WeeklyDigestGroup[];
};

export type DigestPreferences = {
  emailEnabled: boolean;
  inAppEnabled: boolean;
  lastEmailSentAt: string | null;
  emailAvailable: boolean;
  emailDeliveryConfigured: boolean;
};

export type DigestPreferencesUpdate = {
  emailEnabled?: boolean;
  inAppEnabled?: boolean;
};

export type DigestEmailSendResponse = {
  sent: boolean;
  message: string;
};
