import type { Env } from '../../config/env.js';
import { GeminiApiError, GeminiClient } from './geminiClient.js';
import { createOpenAiCompatibleClient } from './openaiCompatibleClient.js';
import {
  type AgentLlmConfig,
  type AgentLlmProvider,
  LlmApiError,
  type LlmClient,
} from './types.js';

const DEFAULT_MODELS: Record<AgentLlmProvider, string> = {
  groq: 'llama-3.3-70b-versatile',
  openai: 'gpt-4o-mini',
  gemini: 'gemini-2.5-flash-lite',
};

export function createAgentLlmClient(env: Env): AgentLlmConfig | null {
  if (env.AGENT_ENABLED === false) return null;

  const provider = resolveProvider(env);
  const apiKey = apiKeyForProvider(env, provider);
  if (!apiKey) return null;

  const model = resolveModel(provider, env.AGENT_MODEL);
  const client = buildClient(provider, apiKey, model);

  return { client, provider, model };
}

export function resolveProvider(env: Env): AgentLlmProvider {
  if (env.AGENT_PROVIDER) return env.AGENT_PROVIDER;

  if (env.GROQ_API_KEY) return 'groq';
  if (env.OPENAI_API_KEY) return 'openai';
  if (env.GEMINI_API_KEY) return 'gemini';
  return 'groq';
}

function apiKeyForProvider(env: Env, provider: AgentLlmProvider): string | undefined {
  switch (provider) {
    case 'groq':
      return env.GROQ_API_KEY;
    case 'openai':
      return env.OPENAI_API_KEY;
    case 'gemini':
      return env.GEMINI_API_KEY;
  }
}

function resolveModel(provider: AgentLlmProvider, configured: string): string {
  if (provider === 'groq' && modelLooksForeign(configured, 'groq')) {
    return DEFAULT_MODELS.groq;
  }
  if (provider === 'openai' && modelLooksForeign(configured, 'openai')) {
    return DEFAULT_MODELS.openai;
  }
  if (provider === 'gemini' && modelLooksForeign(configured, 'gemini')) {
    return DEFAULT_MODELS.gemini;
  }
  return configured || DEFAULT_MODELS[provider];
}

function modelLooksForeign(model: string, provider: AgentLlmProvider): boolean {
  const lower = model.toLowerCase();
  if (provider === 'groq') {
    return lower.startsWith('gemini') || lower.startsWith('gpt-');
  }
  if (provider === 'openai') {
    return lower.startsWith('gemini') || lower.startsWith('llama') || lower.includes('mixtral');
  }
  if (provider === 'gemini') {
    return lower.startsWith('gpt-') || lower.startsWith('llama') || lower.includes('mixtral');
  }
  return false;
}

function buildClient(provider: AgentLlmProvider, apiKey: string, model: string): LlmClient {
  switch (provider) {
    case 'groq':
      return createOpenAiCompatibleClient({
        apiKey,
        model,
        baseUrl: 'https://api.groq.com/openai/v1',
        provider: 'groq',
      });
    case 'openai':
      return createOpenAiCompatibleClient({
        apiKey,
        model,
        baseUrl: 'https://api.openai.com/v1',
        provider: 'openai',
      });
    case 'gemini':
      return wrapGeminiClient(new GeminiClient(apiKey, model));
  }
}

function wrapGeminiClient(gemini: GeminiClient): LlmClient {
  return {
    async generateReply(input) {
      try {
        return await gemini.generateReply({
          systemInstruction: input.systemInstruction,
          messages: input.messages.map((message) => ({
            role: message.role === 'assistant' ? 'model' : 'user',
            content: message.content,
          })),
        });
      } catch (err) {
        if (err instanceof GeminiApiError) {
          throw new LlmApiError(err.message, err.statusCode, 'gemini');
        }
        throw err;
      }
    },
  };
}
