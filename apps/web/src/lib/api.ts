import type {
  AnalyticsBundle,
  HealthResponse,
  JourneyBundle,
  PullRequestList,
  PullRequestStatusFilter,
  RepositorySummary,
  StatsSummary,
  SyncStatus,
  UserProfile,
} from '@osct/shared';

type ApiEnvelope<T> = {
  data: T;
};

type ApiError = {
  error: { code: string; message: string };
};

const fetchOpts: RequestInit = {
  credentials: 'include',
};

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...fetchOpts, ...init });

  if (!res.ok) {
    const body = await parseJson<ApiError>(res);
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }

  const json = await parseJson<ApiEnvelope<T>>(res);
  return json.data;
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/v1/health', fetchOpts);

  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check failed (${res.status})`);
  }

  const json = await parseJson<ApiEnvelope<HealthResponse>>(res);
  return json.data;
}

export async function fetchMe(): Promise<UserProfile | null> {
  const res = await fetch('/api/v1/users/me', fetchOpts);
  if (res.status === 401) return null;

  if (!res.ok) {
    const body = await parseJson<ApiError>(res);
    throw new Error(body.error.message);
  }

  const json = await parseJson<ApiEnvelope<UserProfile>>(res);
  return json.data;
}

export function loginWithGitHub(): void {
  window.location.href = '/api/v1/auth/github';
}

export async function logout(): Promise<void> {
  const res = await fetch('/api/v1/auth/logout', {
    ...fetchOpts,
    method: 'POST',
  });

  if (!res.ok && res.status !== 204) {
    throw new Error('Logout failed');
  }
}

export function startSync(): Promise<SyncStatus> {
  return apiFetch<SyncStatus>('/api/v1/sync', { method: 'POST' });
}

export function fetchSyncStatus(): Promise<SyncStatus | null> {
  return apiFetch<SyncStatus | null>('/api/v1/sync/status');
}

export function fetchStats(): Promise<StatsSummary> {
  return apiFetch<StatsSummary>('/api/v1/stats/summary');
}

export function fetchRepositories(limit = 100): Promise<RepositorySummary[]> {
  return apiFetch<RepositorySummary[]>(`/api/v1/repositories?limit=${limit}`);
}

export function fetchAnalytics(from?: string, to?: string): Promise<AnalyticsBundle> {
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const qs = params.toString();
  return apiFetch<AnalyticsBundle>(`/api/v1/analytics${qs ? `?${qs}` : ''}`);
}

export type FetchPullRequestsOpts = {
  repo?: string;
  status?: PullRequestStatusFilter;
  sort?: 'newest' | 'oldest';
  limit?: number;
};

export function fetchPullRequests(opts: FetchPullRequestsOpts = {}): Promise<PullRequestList> {
  const params = new URLSearchParams({ limit: String(opts.limit ?? 500) });
  if (opts.repo) params.set('repo', opts.repo);
  if (opts.status && opts.status !== 'all') params.set('status', opts.status);
  if (opts.sort) params.set('sort', opts.sort);
  return apiFetch<PullRequestList>(`/api/v1/pull-requests?${params}`);
}

export function fetchJourney(): Promise<JourneyBundle> {
  return apiFetch<JourneyBundle>('/api/v1/journey');
}
