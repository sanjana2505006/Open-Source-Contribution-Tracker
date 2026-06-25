import type { DigestIssueItem, IssueItem } from '@osct/shared';

export function parseIssueFromAgentItem(issue: IssueItem): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const match = issue.htmlUrl.match(/github\.com\/([^/]+)\/([^/]+)\/issues\/(\d+)/i);
  if (!match) return null;
  return {
    owner: match[1]!,
    repo: match[2]!,
    number: Number(match[3]),
  };
}

/** Map digest rows to IssueItem shape for the agent panel. */
export function digestIssueToAgentItem(issue: DigestIssueItem): IssueItem {
  return {
    id: issue.id,
    title: issue.title,
    state: 'open',
    occurredAt: new Date().toISOString(),
    htmlUrl: issue.htmlUrl,
    repositoryFullName: issue.repositoryFullName,
    roles: issue.roles,
    stuckDays: issue.stuckDays,
    stuckReason: issue.stuckReason,
  };
}
