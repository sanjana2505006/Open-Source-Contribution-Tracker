import type { Request, Response } from 'express';
import { UserActivityRepository } from '../repositories/userActivityRepository.js';
import { FeedbackRepository } from '../repositories/feedbackRepository.js';

export function createAdminRoutes(db: import('pg').Pool) {
  const activity = new UserActivityRepository(db);
  const feedback = new FeedbackRepository(db);

  return {
    async users(_req: Request, res: Response): Promise<void> {
      const data = await activity.listUsersForAdmin();
      res.json({ data });
    },

    async feedbackList(req: Request, res: Response): Promise<void> {
      const limitParam = typeof req.query.limit === 'string' ? Number(req.query.limit) : 50;
      const limit = Number.isFinite(limitParam) ? limitParam : 50;
      const data = await feedback.list(limit);
      res.json({ data });
    },
  };
}
