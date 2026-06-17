export class GeminiApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
  ) {
    super(message);
    this.name = 'GeminiApiError';
  }
}

export class GeminiClient {
  constructor(
    private apiKey: string,
    private model: string,
  ) {}

  async generateReply(input: {
    systemInstruction: string;
    messages: Array<{ role: 'user' | 'model'; content: string }>;
  }): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(this.model)}:generateContent?key=${encodeURIComponent(this.apiKey)}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: input.systemInstruction }],
        },
        contents: input.messages.map((message) => ({
          role: message.role,
          parts: [{ text: message.content }],
        })),
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 2048,
        },
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      const parsed = parseGeminiErrorBody(text);
      throw new GeminiApiError(parsed, res.status);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: { parts?: Array<{ text?: string }> };
      }>;
    };

    const reply = json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text ?? '')
      .join('')
      .trim();

    if (!reply) {
      throw new GeminiApiError('Gemini returned an empty response', 502);
    }

    return reply;
  }
}

function parseGeminiErrorBody(text: string): string {
  try {
    const json = JSON.parse(text) as { error?: { message?: string } };
    if (json.error?.message) return json.error.message;
  } catch {
    // fall through
  }
  return text.slice(0, 400);
}
