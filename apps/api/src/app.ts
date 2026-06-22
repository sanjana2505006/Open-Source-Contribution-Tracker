import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { attachSession, requireAuth } from './middleware/auth.js';
import { requireAdmin } from './middleware/admin.js';
import { createActivityMiddleware } from './middleware/activity.js';
import { SessionRepository } from './repositories/sessionRepository.js';
import { createAdminRoutes } from './routes/admin.js';
import { createHealthHandler } from './routes/health.js';
import { createAuthRoutes, createUserRoutes } from './routes/auth.js';
import { createSyncRoutes } from './routes/sync.js';
import { createRepositoryRoutes } from './routes/repositories.js';
import { createExploreRoutes } from './routes/explore.js';
import { createPublicRoutes } from './routes/public.js';
import { createPullRequestRoutes } from './routes/pullRequests.js';
import { createIssueRoutes } from './routes/issues.js';
import { createAnalyticsRoutes } from './routes/analytics.js';
import { createJourneyRoutes } from './routes/journey.js';
import { createFeedbackRoutes } from './routes/feedback.js';
import { AuthService } from './services/authService.js';
import { SyncService } from './services/syncService.js';
import { AnalyticsService } from './services/analyticsService.js';
import { HeatmapService } from './services/heatmapService.js';
import { ExploreService } from './services/exploreService.js';
import { PortfolioHighlightsService } from './services/portfolioHighlightsService.js';
import { JourneyService } from './services/journeyService.js';
import { AgentService } from './services/agentService.js';
import { createAgentRoutes } from './routes/agent.js';
import { getPool } from './infrastructure/db/pool.js';

export function createApp(env: Env) {
  const pool = getPool(env);
  const sessions = new SessionRepository(pool);
  const auth = new AuthService(env, pool);
  const sync = new SyncService(env, pool);
  const analytics = new AnalyticsService(pool);
  const heatmap = new HeatmapService(env, pool);
  const explore = new ExploreService(env, pool);
  const portfolioHighlights = new PortfolioHighlightsService(env, pool);
  const journey = new JourneyService(pool);
  const agent = new AgentService(env, pool);
  const authRoutes = createAuthRoutes(auth, env);
  const userRoutes = createUserRoutes(env);
  const adminRoutes = createAdminRoutes(pool);
  const syncRoutes = createSyncRoutes(sync);
  const repositoryRoutes = createRepositoryRoutes(pool);
  const analyticsRoutes = createAnalyticsRoutes(analytics, heatmap);
  const exploreRoutes = createExploreRoutes(explore);
  const publicRoutes = createPublicRoutes(explore, portfolioHighlights);
  const pullRequestRoutes = createPullRequestRoutes(pool);
  const issueRoutes = createIssueRoutes(pool);
  const journeyRoutes = createJourneyRoutes(journey);
  const feedbackRoutes = createFeedbackRoutes(pool);
  const agentRoutes = createAgentRoutes(agent);

  const app = express();

  if (env.NODE_ENV === 'production') {
    app.set('trust proxy', 1);
  }

  app.use(
    cors({
      origin: env.WEB_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());
  app.use(cookieParser());
  app.use(attachSession(auth));
  app.use(createActivityMiddleware(sessions));

  app.get('/api/v1/health', createHealthHandler(env));

  app.get('/api/v1/auth/github', authRoutes.githubLogin);
  app.get('/api/v1/auth/github/callback', (req, res, next) => {
    authRoutes.githubCallback(req, res).catch(next);
  });
  app.post('/api/v1/auth/logout', (req, res, next) => {
    authRoutes.logout(req, res).catch(next);
  });

  app.get('/api/v1/users/me', requireAuth, userRoutes.me);

  app.get('/api/v1/admin/users', requireAuth, requireAdmin(env), (req, res, next) => {
    adminRoutes.users(req, res).catch(next);
  });
  app.get('/api/v1/admin/feedback', requireAuth, requireAdmin(env), (req, res, next) => {
    adminRoutes.feedbackList(req, res).catch(next);
  });

  app.post('/api/v1/feedback', (req, res, next) => {
    feedbackRoutes.submit(req, res).catch(next);
  });

  app.post('/api/v1/sync', requireAuth, (req, res, next) => {
    syncRoutes.start(req, res).catch(next);
  });
  app.get('/api/v1/sync/status', requireAuth, (req, res, next) => {
    syncRoutes.status(req, res).catch(next);
  });
  app.get('/api/v1/stats/summary', requireAuth, (req, res, next) => {
    syncRoutes.stats(req, res).catch(next);
  });
  app.post('/api/v1/sync/issues', requireAuth, (req, res, next) => {
    syncRoutes.syncIssues(req, res).catch(next);
  });
  app.post('/api/v1/sync/cancel', requireAuth, (req, res, next) => {
    syncRoutes.cancel(req, res).catch(next);
  });
  app.get('/api/v1/repositories', requireAuth, (req, res, next) => {
    repositoryRoutes.list(req, res).catch(next);
  });
  app.get('/api/v1/analytics', requireAuth, (req, res, next) => {
    analyticsRoutes.bundle(req, res).catch(next);
  });
  app.get('/api/v1/analytics/heatmap', requireAuth, (req, res, next) => {
    analyticsRoutes.heatmap(req, res).catch(next);
  });
  app.get('/api/v1/analytics/streak', requireAuth, (req, res, next) => {
    analyticsRoutes.streak(req, res).catch(next);
  });

  app.get('/api/v1/public/profiles/:username', (req, res, next) => {
    publicRoutes.profile(req, res).catch(next);
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

  app.get('/api/v1/pull-requests', requireAuth, (req, res, next) => {
    pullRequestRoutes.list(req, res).catch(next);
  });
  app.get('/api/v1/issues', requireAuth, (req, res, next) => {
    issueRoutes.list(req, res).catch(next);
  });
  app.get('/api/v1/journey', requireAuth, (req, res, next) => {
    journeyRoutes.bundle(req, res).catch(next);
  });

  app.get('/api/v1/agent/status', (req, res, next) => {
    agentRoutes.status(req, res).catch(next);
  });
  app.post('/api/v1/agent/chat', requireAuth, (req, res, next) => {
    agentRoutes.chat(req, res).catch(next);
  });
  app.get('/api/v1/agent/sessions/:id', requireAuth, (req, res, next) => {
    agentRoutes.session(req, res).catch(next);
  });
  app.post('/api/v1/agent/actions/propose', requireAuth, (req, res, next) => {
    agentRoutes.propose(req, res).catch(next);
  });
  app.post('/api/v1/agent/actions/:id/approve', requireAuth, (req, res, next) => {
    agentRoutes.approve(req, res).catch(next);
  });
  app.post('/api/v1/agent/actions/:id/cancel', requireAuth, (req, res, next) => {
    agentRoutes.cancel(req, res).catch(next);
  });

  if (env.NODE_ENV === 'production') {
    const webDist = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      '../../web/dist',
    );
    app.use(express.static(webDist));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) {
        next();
        return;
      }
      res.sendFile(path.join(webDist, 'index.html'), (err) => {
        if (err) next(err);
      });
    });
  }

  app.use(errorHandler);

  return app;
}
