import type { IssueAiCheckRequest, IssueAiCheckResult } from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

const fetchOpts: RequestInit = {
  credentials: 'include',
};

async function issueAiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...fetchOpts, ...init });

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

export function checkIssueAi(input: IssueAiCheckRequest): Promise<IssueAiCheckResult> {
  return issueAiFetch<IssueAiCheckResult>('/api/v1/issues/ai-check', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export function fetchIssueAiCheckStatus(): Promise<{ enabled: boolean }> {
  return issueAiFetch<{ enabled: boolean }>('/api/v1/issues/ai-check/status');
}
