import { LlmApiError, type LlmClient } from './types.js';

type OpenAiCompatibleConfig = {
  apiKey: string;
  model: string;
  baseUrl: string;
  provider: string;
};

export function createOpenAiCompatibleClient(config: OpenAiCompatibleConfig): LlmClient {
  return {
    async generateReply(input) {
      const messages = [
        { role: 'system' as const, content: input.systemInstruction },
        ...input.messages.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ];

      const res = await fetch(`${config.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify({
          model: config.model,
          messages,
          temperature: 0.4,
          max_tokens: 2048,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new LlmApiError(parseErrorBody(text), res.status, config.provider);
      }

      const json = (await res.json()) as {
        choices?: Array<{ message?: { content?: string | null } }>;
      };

      const reply = json.choices?.[0]?.message?.content?.trim();
      if (!reply) {
        throw new LlmApiError('Model returned an empty response', 502, config.provider);
      }

      return reply;
    },
  };
}

function parseErrorBody(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // fall through
  }
  return text.slice(0, 400);
}
