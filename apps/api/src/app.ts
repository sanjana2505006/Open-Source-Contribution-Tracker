import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachSession, requireAuth } from './middleware/auth.js';
import { createHealthHandler } from './routes/health.js';
import { createAuthRoutes, createUserRoutes } from './routes/auth.js';
import { createSyncRoutes } from './routes/sync.js';
import { createRepositoryRoutes } from './routes/repositories.js';
import { createExploreRoutes } from './routes/explore.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { AuthService } from './services/authService.js';
import { SyncService } from './services/syncService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { ExploreService } from './services/exploreService.js';
import { getPool } from './infrastructure/db/pool.js';

export function createApp(env: Env) {
  const pool = getPool(env);
  const auth = new AuthService(env, pool);
  const sync = new SyncService(env, pool);
  const analytics = new AnalyticsService(pool);
  const explore = new ExploreService(env, pool);
  const authRoutes = createAuthRoutes(auth, env);
  const userRoutes = createUserRoutes();
  const syncRoutes = createSyncRoutes(sync);
  const repositoryRoutes = createRepositoryRoutes(pool);
  const analyticsRoutes = createAnalyticsRoutes(analytics);
  const exploreRoutes = createExploreRoutes(explore);

  const app = express();

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

  app.post('/api/v1/sync', requireAuth, (req, res, next) => {
    syncRoutes.start(req, res).catch(next);
  });
  app.get('/api/v1/sync/status', requireAuth, (req, res, next) => {
    syncRoutes.status(req, res).catch(next);
  });
  app.get('/api/v1/stats/summary', requireAuth, (req, res, next) => {
    syncRoutes.stats(req, res).catch(next);
  });
  app.get('/api/v1/repositories', requireAuth, (req, res, next) => {
    repositoryRoutes.list(req, res).catch(next);
  });
  app.get('/api/v1/analytics', requireAuth, (req, res, next) => {
    analyticsRoutes.bundle(req, res).catch(next);
  });

  app.get('/api/v1/explore/:username', requireAuth, (req, res, next) => {
    exploreRoutes.lookup(req, res).catch(next);
  });
  app.get('/api/v1/watchlist', requireAuth, (req, res, next) => {
    exploreRoutes.listWatched(req, res).catch(next);
  });
  app.post('/api/v1/watchlist', requireAuth, (req, res, next) => {
    exploreRoutes.watch(req, res).catch(next);
  });
  app.delete('/api/v1/watchlist/:username', requireAuth, (req, res, next) => {
    exploreRoutes.unwatch(req, res).catch(next);
  });
  app.post('/api/v1/watchlist/:username/refresh', requireAuth, (req, res, next) => {
    exploreRoutes.refresh(req, res).catch(next);
  });

  app.use(errorHandler);

  return app;
}
