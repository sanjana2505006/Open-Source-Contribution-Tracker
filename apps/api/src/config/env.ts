import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().default(4000),
  WEB_ORIGIN: z.string().url().default('http://localhost:5173'),
  API_ORIGIN: z.string().url().default('http://localhost:4000'),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  GITHUB_CLIENT_ID: z.string().min(1, 'GITHUB_CLIENT_ID is required'),
  GITHUB_CLIENT_SECRET: z.string().min(1, 'GITHUB_CLIENT_SECRET is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  SESSION_MAX_AGE_DAYS: z.coerce.number().default(30),
  ADMIN_USERNAMES: z.string().optional(),
  GITHUB_PUBLIC_TOKEN: z.string().optional(),
  AGENT_ENABLED: z
    .string()
    .optional()
    .transform((value) => value !== 'false' && value !== '0'),
  AGENT_PROVIDER: z.enum(['groq', 'openai', 'gemini']).optional(),
  GROQ_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  OPENAI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  GEMINI_API_KEY: z
    .string()
    .optional()
    .transform((value) => value?.trim() || undefined),
  AGENT_MODEL: z.string().default('llama-3.3-70b-versatile'),
  AGENT_RATE_LIMIT_PER_HOUR: z.coerce.number().default(30),
});

export type Env = z.infer<typeof envSchema>;

export function loadEnv(): Env {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const message = result.error.issues.map((i) => i.message).join(', ');
    throw new Error(`Invalid environment: ${message}`);
  }

  return result.data;
}
