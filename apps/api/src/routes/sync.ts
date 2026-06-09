import type { Request, Response } from 'express';
import type { SyncService } from '../services/syncService.js';
import { AppError } from '../middleware/errorHandler.js';

export function createSyncRoutes(sync: SyncService) {
  return {
    async start(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const job = await sync.startSync(req.user.id);
      res.status(202).json({ data: job });
    },

    async status(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const job = await sync.getStatus(req.user.id);
      res.json({ data: job });
    },

    async stats(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const stats = await sync.getStats(req.user.id);
      res.json({ data: stats });
    },
  };
}
