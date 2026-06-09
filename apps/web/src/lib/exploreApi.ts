import type { ContributorProfile, WatchedContributor } from '@osct/shared';

const fetchOpts: RequestInit = { credentials: 'include' };

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

export function exploreUser(username: string): Promise<ContributorProfile> {
  const clean = username.trim().replace(/^@/, '');
  return fetch(`/api/v1/explore/${encodeURIComponent(clean)}`, fetchOpts).then(async (res) => {
    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      throw new Error(body.error?.message ?? `Lookup failed (${res.status})`);
    }
    const json = (await res.json()) as ApiEnvelope<ContributorProfile>;
    return json.data;
  });
}

export function fetchWatchlist(): Promise<WatchedContributor[]> {
  return fetch('/api/v1/watchlist', fetchOpts).then(async (res) => {
    if (!res.ok) throw new Error('Failed to load watchlist');
    const json = (await res.json()) as ApiEnvelope<WatchedContributor[]>;
    return json.data;
  });
}

export function watchUser(username: string): Promise<ContributorProfile> {
  return fetch('/api/v1/watchlist', {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.trim().replace(/^@/, '') }),
  }).then(async (res) => {
    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      throw new Error(body.error?.message ?? 'Failed to watch user');
    }
    const json = (await res.json()) as ApiEnvelope<ContributorProfile>;
    return json.data;
  });
}

export function unwatchUser(username: string): Promise<void> {
  const clean = username.trim().replace(/^@/, '');
  return fetch(`/api/v1/watchlist/${encodeURIComponent(clean)}`, {
    ...fetchOpts,
    method: 'DELETE',
  }).then((res) => {
    if (!res.ok && res.status !== 204) throw new Error('Failed to remove from watchlist');
  });
}

export function refreshWatched(username: string): Promise<ContributorProfile> {
  const clean = username.trim().replace(/^@/, '');
  return fetch(`/api/v1/watchlist/${encodeURIComponent(clean)}/refresh`, {
    ...fetchOpts,
    method: 'POST',
  }).then(async (res) => {
    if (!res.ok) {
      const body = (await res.json()) as ApiError;
      throw new Error(body.error?.message ?? 'Refresh failed');
    }
    const json = (await res.json()) as ApiEnvelope<ContributorProfile>;
    return json.data;
  });
}
