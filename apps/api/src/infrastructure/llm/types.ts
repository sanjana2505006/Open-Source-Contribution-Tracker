export type LlmChatRole = 'user' | 'assistant';

export type LlmChatMessage = {
  role: LlmChatRole;
  content: string;
};

export interface LlmClient {
  generateReply(input: {
    systemInstruction: string;
    messages: LlmChatMessage[];
  }): Promise<string>;
}

export class LlmApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public provider: string,
  ) {
    super(message);
    this.name = 'LlmApiError';
  }
}

export type AgentLlmProvider = 'groq' | 'openai' | 'gemini';

export type AgentLlmConfig = {
  client: LlmClient;
  provider: AgentLlmProvider;
  model: string;
};
