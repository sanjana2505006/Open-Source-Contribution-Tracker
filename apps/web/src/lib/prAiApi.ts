import type { PrAiCheckRequest, PrAiCheckResult } from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

const fetchOpts: RequestInit = {
  credentials: 'include',
};

async function prAiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...fetchOpts, ...init });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

export function checkPullRequestAi(input: PrAiCheckRequest): Promise<PrAiCheckResult> {
  return prAiFetch<PrAiCheckResult>('/api/v1/pull-requests/ai-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchPrAiCheckStatus(): Promise<{ enabled: boolean }> {
  return prAiFetch<{ enabled: boolean }>('/api/v1/pull-requests/ai-check/status');
}
