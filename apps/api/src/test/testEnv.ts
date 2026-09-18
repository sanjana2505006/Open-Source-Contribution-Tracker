import type { Env } from '../config/env.js';

/** Minimal env for API tests — does not connect to real GitHub/Resend. */
export function testEnv(overrides: Partial<Env> = {}): Env {
  return {
    NODE_ENV: 'test',
    PORT: 4000,
    WEB_ORIGIN: 'http://localhost:5173',
    API_ORIGIN: 'http://localhost:4000',
    DATABASE_URL: 'postgresql://osct:osct@127.0.0.1:5432/osct_test',
    GITHUB_CLIENT_ID: 'test-client-id',
    GITHUB_CLIENT_SECRET: 'test-client-secret',
    SESSION_SECRET: 'test-session-secret-at-least-32-chars!!',
    SESSION_MAX_AGE_DAYS: 30,
    ADMIN_USERNAMES: undefined,
    GITHUB_PUBLIC_TOKEN: undefined,
    AGENT_ENABLED: false,
    AGENT_PROVIDER: undefined,
    GROQ_API_KEY: undefined,
    OPENAI_API_KEY: undefined,
    GEMINI_API_KEY: undefined,
    AGENT_MODEL: 'llama-3.3-70b-versatile',
    AGENT_RATE_LIMIT_PER_HOUR: 30,
    RESEND_API_KEY: undefined,
    DIGEST_FROM_EMAIL: undefined,
    CRON_SECRET: undefined,
    ...overrides,
  };
}
