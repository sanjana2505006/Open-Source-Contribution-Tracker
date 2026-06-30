import type { Request, Response } from 'express';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { GoodFirstIssueService } from '../services/goodFirstIssueService.js';

export function createRecommendationsRoutes(db: pg.Pool, env: Env) {
  const recommendations = new GoodFirstIssueService(env, db);

  return {
    async goodFirstIssues(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');
      const data = await recommendations.recommend(req.user.id);
      res.json({ data });
    },
  };
}
