export type AgentContextType = 'general' | 'issue' | 'pull_request';

export type AgentContext = {
  type: AgentContextType;
  owner?: string;
  repo?: string;
  number?: number;
};

export type AgentChatRequest = {
  message: string;
  sessionId?: string;
  context?: AgentContext;
};

export type AgentSource = {
  type: 'issue' | 'pull_request' | 'repository';
  label: string;
  url: string;
};

export type AgentChatResponse = {
  sessionId: string;
  reply: string;
  sources: AgentSource[];
};

export type AgentMessageRecord = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  createdAt: string;
};

export type AgentSessionDetail = {
  id: string;
  contextType: AgentContextType | null;
  contextRef: string | null;
  messages: AgentMessageRecord[];
  createdAt: string;
  updatedAt: string;
};
