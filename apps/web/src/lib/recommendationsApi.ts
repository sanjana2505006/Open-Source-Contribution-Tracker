import type { GoodFirstIssueRecommendations } from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

const fetchOpts: RequestInit = {
  credentials: 'include',
};

async function recommendationsFetch<T>(path: string): Promise<T> {
  const res = await fetch(path, fetchOpts);

  if (!res.ok) {
    const body = (await res.json()) as ApiError;
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<T>;
  return json.data;
}

export function fetchGoodFirstIssues(): Promise<GoodFirstIssueRecommendations> {
  return recommendationsFetch<GoodFirstIssueRecommendations>(
    '/api/v1/recommendations/good-first-issues',
  );
}
