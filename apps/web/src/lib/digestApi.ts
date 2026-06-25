import type {
  DigestEmailSendResponse,
  DigestPreferences,
  DigestPreferencesUpdate,
  WeeklyDigest,
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

export function fetchWeeklyDigest(): Promise<WeeklyDigest> {
  return apiFetch<WeeklyDigest>('/api/v1/digest/weekly');
}

export function fetchDigestPreferences(): Promise<DigestPreferences> {
  return apiFetch<DigestPreferences>('/api/v1/digest/preferences');
}

export function updateDigestPreferences(
  input: DigestPreferencesUpdate,
): Promise<DigestPreferences> {
  return apiFetch<DigestPreferences>('/api/v1/digest/preferences', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function sendDigestEmail(): Promise<DigestEmailSendResponse> {
  return apiFetch<DigestEmailSendResponse>('/api/v1/digest/email', { method: 'POST' });
}
