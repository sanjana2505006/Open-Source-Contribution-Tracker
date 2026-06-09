import type { HealthResponse } from '@osct/shared';

type ApiEnvelope<T> = {
  data: T;
};

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch('/api/v1/health');

  if (!res.ok && res.status !== 503) {
    throw new Error(`Health check failed (${res.status})`);
  }

  const json = (await res.json()) as ApiEnvelope<HealthResponse>;
  return json.data;
}
