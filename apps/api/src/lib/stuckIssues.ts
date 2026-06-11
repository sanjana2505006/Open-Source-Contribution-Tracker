import type { IssueRole } from '@osct/shared';

export const STUCK_DAYS = 30;

type IssueMetadata = {
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
};

export function issueActivityAt(
  metadata: IssueMetadata | null | undefined,
  occurredAt: Date,
): Date {
  if (metadata?.updatedAt) {
    const parsed = new Date(metadata.updatedAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  if (metadata?.createdAt) {
    const parsed = new Date(metadata.createdAt);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return occurredAt;
}

export function stuckDaysSince(
  metadata: IssueMetadata | null | undefined,
  occurredAt: Date,
  now = Date.now(),
): number {
  const ref = issueActivityAt(metadata, occurredAt);
  return Math.floor((now - ref.getTime()) / (1000 * 60 * 60 * 24));
}

export function isStuckIssue(
  state: string | null,
  metadata: IssueMetadata | null | undefined,
  occurredAt: Date,
  now = Date.now(),
): boolean {
  if (state !== 'open') return false;
  return stuckDaysSince(metadata, occurredAt, now) >= STUCK_DAYS;
}

export function stuckReason(roles: IssueRole[]): string {
  const assigned = roles.includes('assigned');
  const commented = roles.includes('commented');
  const authored = roles.includes('authored');

  if (commented && !assigned) {
    return 'No assignment after your comment';
  }
  if (assigned) {
    return 'Assigned — no recent activity';
  }
  if (authored) {
    return 'Opened — no recent activity';
  }
  return 'Inactive for 30+ days';
}
