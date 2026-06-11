import type { Request, Response } from 'express';
import { UserActivityRepository } from '../repositories/userActivityRepository.js';

export function createAdminRoutes(db: import('pg').Pool) {
  const activity = new UserActivityRepository(db);

  return {
    async users(_req: Request, res: Response): Promise<void> {
      const data = await activity.listUsersForAdmin();
      res.json({ data });
    },
  };
}
