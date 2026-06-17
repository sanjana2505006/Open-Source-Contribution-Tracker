import type { Env } from '../config/env.js';
import { createAgentLlmClient } from '../infrastructure/llm/createAgentLlmClient.js';

export function getAgentStartupMessage(env: Env): string {
  const llm = createAgentLlmClient(env);
  if (!llm) {
    return 'Agent: disabled — set GROQ_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY in .env';
  }
  return `Agent: enabled (${llm.provider} / ${llm.model})`;
}
