import type { UserProfile } from '@osct/shared';

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

export async function fetchHealth() {
  const res = await fetch('/api/v1/health', fetchOpts);

  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check failed (${res.status})`);
  }

  const json = await parseJson<ApiEnvelope<import('@osct/shared').HealthResponse>>(res);
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
