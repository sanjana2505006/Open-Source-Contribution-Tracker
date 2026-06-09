import express from 'express';
import cors from 'cors';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { createHealthHandler } from './routes/health.js';

export function createApp(env: Env) {
  const app = express();

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/api/v1/health', createHealthHandler(env));

  app.use(errorHandler);

  return app;
}
