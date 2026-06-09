import type { Request, Response } from 'express';
import type { ExploreService } from '../services/exploreService.js';
import { AppError } from '../middleware/errorHandler.js';
import { RateLimitError } from '../services/exploreService.js';

function handleExploreError(err: unknown): never {
  if (err instanceof RateLimitError) {
    throw new AppError(429, 'GitHub rate limit hit — try again later', 'RATE_LIMIT');
  }
  if (err instanceof Error) {
    if (err.message.includes('not found')) {
      throw new AppError(404, err.message, 'NOT_FOUND');
    }
    if (err.message.includes('Invalid GitHub')) {
      throw new AppError(400, err.message, 'INVALID_USERNAME');
    }
    throw new AppError(502, err.message, 'GITHUB_ERROR');
  }
  throw err;
}

export function createExploreRoutes(explore: ExploreService) {
  return {
    async lookup(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const username = req.params.username;
      if (!username) throw new AppError(400, 'Username required', 'BAD_REQUEST');

      try {
        const data = await explore.lookup(req.user.id, username);
        res.json({ data });
      } catch (err) {
        handleExploreError(err);
      }
    },

    async watch(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const body = req.body as { username?: string };
      if (!body.username?.trim()) {
        throw new AppError(400, 'username is required', 'BAD_REQUEST');
      }

      try {
        const data = await explore.watch(req.user.id, body.username);
        res.status(201).json({ data });
      } catch (err) {
        handleExploreError(err);
      }
    },

    async unwatch(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      try {
        await explore.unwatch(req.user.id, req.params.username!);
        res.status(204).send();
      } catch (err) {
        if (err instanceof Error && err.message.includes('watchlist')) {
          throw new AppError(404, err.message, 'NOT_FOUND');
        }
        handleExploreError(err);
      }
    },

    async listWatched(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const data = await explore.listWatched(req.user.id);
      res.json({ data });
    },

    async refresh(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      try {
        const data = await explore.lookup(req.user.id, req.params.username!);
        res.json({ data });
      } catch (err) {
        handleExploreError(err);
      }
    },
  };
}
