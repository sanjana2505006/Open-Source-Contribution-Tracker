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

export type AgentActionType = 'comment_on_issue';

export type AgentActionStatus = 'pending' | 'completed' | 'failed' | 'cancelled';

export type AgentActionPayload = {
  owner: string;
  repo: string;
  number: number;
  body: string;
};

export type AgentProposedAction = {
  id: string;
  type: AgentActionType;
  status: AgentActionStatus;
  preview: {
    owner: string;
    repo: string;
    number: number;
    body: string;
    issueUrl: string;
  };
  createdAt: string;
  executedAt: string | null;
  githubUrl: string | null;
  errorMessage: string | null;
};

export type AgentChatResponse = {
  sessionId: string;
  reply: string;
  sources: AgentSource[];
  proposedActions: AgentProposedAction[];
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
  actions: AgentProposedAction[];
  createdAt: string;
  updatedAt: string;
};

export type AgentActionApproveRequest = {
  body?: string;
};

export type AgentActionApproveResponse = {
  id: string;
  status: 'completed';
  githubUrl: string;
};

export type AgentActionProposeRequest = {
  sessionId: string;
  owner: string;
  repo: string;
  number: number;
  body: string;
};

export type AgentActionProposeResponse = AgentProposedAction;

export type AgentActionCancelResponse = {
  id: string;
  status: 'cancelled';
};

