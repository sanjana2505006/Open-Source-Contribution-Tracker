import type { ContributorProfile, PublicProfile } from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

/** Public site used for share links (LinkedIn rejects localhost). */
export const PUBLIC_SITE_ORIGIN = 'https://osct.onrender.com';

export function portfolioPath(username: string): string {
  return `/u/${username.trim().replace(/^@/, '')}`;
}

/** Link for browsing inside the app (current origin). */
export function portfolioUrl(username: string): string {
  if (typeof window === 'undefined') return portfolioPath(username);
  return `${window.location.origin}${portfolioPath(username)}`;
}

/** Link for LinkedIn / social share — always a public HTTPS URL. */
export function sharePortfolioUrl(username: string): string {
  if (typeof window === 'undefined') {
    return `${PUBLIC_SITE_ORIGIN}${portfolioPath(username)}`;
  }

  const { hostname, origin } = window.location;
  const isLocal = hostname === 'localhost' || hostname === '127.0.0.1';
  const base = isLocal ? PUBLIC_SITE_ORIGIN : origin;
  return `${base}${portfolioPath(username)}`;
}

export function fetchPublicProfile(username: string): Promise<PublicProfile> {
  const clean = username.trim().replace(/^@/, '');
  return fetch(`/api/v1/public/profiles/${encodeURIComponent(clean)}`).then(async (res) => {
    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      throw new Error(body.error?.message ?? `Profile unavailable (${res.status})`);
    }
    const json = (await res.json()) as ApiEnvelope<PublicProfile>;
    return json.data;
  });
}

export function buildPortfolioSummary(profile: ContributorProfile): string {
  const name = profile.displayName ?? profile.username;
  const url = sharePortfolioUrl(profile.username);

  return [
    `${name} — Open Source Portfolio`,
    `${profile.stats.pullRequests} pull requests · ${profile.stats.repositories} repositories · ${profile.stats.commits} recent commits`,
    `View on OSCT: ${url}`,
  ].join('\n');
}
