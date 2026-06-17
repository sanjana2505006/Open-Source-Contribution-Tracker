import type {
  AgentChatRequest,
  AgentChatResponse,
  AgentSessionDetail,
} from '@osct/shared';

type ApiEnvelope<T> = { data: T };
type ApiError = { error: { code: string; message: string } };

const fetchOpts: RequestInit = {
  credentials: 'include',
};

async function parseJson<T>(res: Response): Promise<T> {
  return res.json() as Promise<T>;
}

async function agentFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, { ...fetchOpts, ...init });

  if (!res.ok) {
    const body = await parseJson<ApiError>(res);
    throw new Error(body.error?.message ?? `Request failed (${res.status})`);
  }

  const json = await parseJson<ApiEnvelope<T>>(res);
  return json.data;
}

export async function fetchAgentStatus(): Promise<{
  enabled: boolean;
  provider: string | null;
  model: string | null;
}> {
  return agentFetch<{ enabled: boolean; provider: string | null; model: string | null }>(
    '/api/v1/agent/status',
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
