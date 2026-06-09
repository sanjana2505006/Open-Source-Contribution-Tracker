import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachSession, requireAuth } from './middleware/auth.js';
import { createHealthHandler } from './routes/health.js';
import { createAuthRoutes, createUserRoutes } from './routes/auth.js';
import { AuthService } from './services/authService.js';
import { getPool } from './infrastructure/db/pool.js';

export function createApp(env: Env) {
  const app = express();
  const auth = new AuthService(env, getPool(env));
  const authRoutes = createAuthRoutes(auth, env);
  const userRoutes = createUserRoutes();

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachSession(auth));

  app.get('/api/v1/health', createHealthHandler(env));

  app.get('/api/v1/auth/github', authRoutes.githubLogin);
  app.get('/api/v1/auth/github/callback', (req, res, next) => {
    authRoutes.githubCallback(req, res).catch(next);
  });
  app.post('/api/v1/auth/logout', (req, res, next) => {
    authRoutes.logout(req, res).catch(next);
  });

  app.get('/api/v1/users/me', requireAuth, userRoutes.me);

  app.use(errorHandler);

  return app;
}
