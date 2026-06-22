import type {
  AgentActionApproveResponse,
  AgentActionCancelResponse,
  AgentActionProposeResponse,
  AgentChatRequest,
  AgentChatResponse,
  AgentSessionDetail,
} from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

const fetchOpts: RequestInit = {
  credentials: 'include',
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isNetworkError(err: unknown): boolean {
  return (
    err instanceof TypeError &&
    (err.message === 'Failed to fetch' ||
      err.message === 'NetworkError when attempting to fetch resource.' ||
      err.message === 'Load failed')
  );
}

function toFetchError(err: unknown): Error {
  if (isNetworkError(err)) {
    return new Error(
      'Cannot reach the API. Run a single npm run dev from the repo root and open http://localhost:5173 (if the API restarted, wait a few seconds and retry).',
    );
  }
  return err instanceof Error ? err : new Error('Request failed');
}

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function agentFetch<T>(path: string, init?: RequestInit, retries = 0): Promise<T> {
  try {
    const res = await fetch(path, { ...fetchOpts, ...init });

    if (!res.ok) {
      const body = await parseJson<ApiError>(res);
      throw new Error(body.error?.message ?? `Request failed (${res.status})`);
    }

    const json = await parseJson<ApiEnvelope<T>>(res);
    return json.data;
  } catch (err: unknown) {
    if (retries > 0 && isNetworkError(err)) {
      await sleep(600);
      return agentFetch(path, init, retries - 1);
    }
    throw toFetchError(err);
  }
}

export async function fetchAgentStatus(): Promise<{
  enabled: boolean;
  provider: string | null;
  model: string | null;
}> {
  return agentFetch<{ enabled: boolean; provider: string | null; model: string | null }>(
    '/api/v1/agent/status',
    undefined,
    2,
  );
}

export async function sendAgentChat(body: AgentChatRequest): Promise<AgentChatResponse> {
  return agentFetch<AgentChatResponse>('/api/v1/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function fetchAgentSession(sessionId: string): Promise<AgentSessionDetail> {
  return agentFetch<AgentSessionDetail>(`/api/v1/agent/sessions/${encodeURIComponent(sessionId)}`);
}

export async function proposeAgentAction(input: {
  sessionId: string;
  owner: string;
  repo: string;
  number: number;
  body: string;
}): Promise<AgentActionProposeResponse> {
  return agentFetch<AgentActionProposeResponse>('/api/v1/agent/actions/propose', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
}

export async function approveAgentAction(
  actionId: string,
  body?: string,
): Promise<AgentActionApproveResponse> {
  return agentFetch<AgentActionApproveResponse>(
    `/api/v1/agent/actions/${encodeURIComponent(actionId)}/approve`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body ? { body } : {}),
    },
  );
}

export async function cancelAgentAction(actionId: string): Promise<AgentActionCancelResponse> {
  return agentFetch<AgentActionCancelResponse>(
    `/api/v1/agent/actions/${encodeURIComponent(actionId)}/cancel`,
    { method: 'POST' },
  );
}
