import type { ContributionStreak, StatsSummary } from '@osct/shared';
import { sharePortfolioUrl } from './portfolio';

export type ProgressShareInput = {
  username: string;
  displayName?: string | null;
  stats: StatsSummary;
  streak?: ContributionStreak | null;
};

export function buildLinkedInPost(input: ProgressShareInput): string {
  const url = sharePortfolioUrl(input.username);
  const lines = [
    '🚀 Open source progress update',
    '',
    `Tracking my GitHub contributions with OSCT — here's my progress:`,
    `• ${input.stats.pullRequests} pull request${input.stats.pullRequests === 1 ? '' : 's'} merged or opened`,
    `• ${input.stats.repositories} active repositor${input.stats.repositories === 1 ? 'y' : 'ies'}`,
  ];

  if (input.stats.commits > 0) {
    lines.push(`• ${input.stats.commits} recent commits`);
  }

  if (input.streak && input.streak.currentStreak > 0) {
    lines.push(`• ${input.streak.currentStreak}-day contribution streak 🔥`);
    if (input.streak.longestStreak > input.streak.currentStreak) {
      lines.push(`• Longest streak: ${input.streak.longestStreak} days`);
    }
  }

  lines.push(
    '',
    `See my full portfolio → ${url}`,
    '',
    '#OpenSource #GitHub #BuildInPublic',
  );

  return lines.join('\n');
}

export function openLinkedInShare(url: string): void {
  const shareUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  shareUrl.searchParams.set('url', url);
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer');
}

export async function shareProgressOnLinkedIn(input: ProgressShareInput): Promise<string> {
  const url = sharePortfolioUrl(input.username);
  const text = buildLinkedInPost(input);
  await navigator.clipboard.writeText(text);
  openLinkedInShare(url);
  return url;
}

export function isLocalDevHost(): boolean {
  if (typeof window === 'undefined') return false;
  const host = window.location.hostname;
  return host === 'localhost' || host === '127.0.0.1';
}
