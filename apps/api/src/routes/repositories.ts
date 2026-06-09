import type { Request, Response } from 'express';
import type pg from 'pg';
import { AppError } from '../middleware/errorHandler.js';
import { UserRepositoryLinkRepository } from '../repositories/userRepositoryLinkRepository.js';

export function createRepositoryRoutes(db: pg.Pool) {
  const links = new UserRepositoryLinkRepository(db);

  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const repos = await links.listForUser(req.user.id);
      res.json({ data: repos });
    },
  };
}
