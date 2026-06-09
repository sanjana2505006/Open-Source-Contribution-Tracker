import type { Request, Response } from 'express';
import type pg from 'pg';
import { AppError } from '../middleware/errorHandler.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';

export function createRepositoryRoutes(db: pg.Pool) {
  const links = new UserRepositoryLinkRepository(db);

  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const limitParam = typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
      const limit = Number.isFinite(limitParam) ? Math.min(Math.max(limitParam, 1), 500) : 100;

      const repos = await links.listForUser(req.user.id, limit);
      res.json({ data: repos });
    },
  };
}
