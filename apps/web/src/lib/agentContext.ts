import type { IssueItem } from '@osct/shared';

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
