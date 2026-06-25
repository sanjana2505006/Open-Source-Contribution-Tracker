import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { DigestService } from '../services/digestService.js';

const preferencesSchema = z.object({
  emailEnabled: z.boolean().optional(),
  inAppEnabled: z.boolean().optional(),
});

export function createDigestRoutes(digest: DigestService) {
  return {
    async weekly(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');
      const data = await digest.getWeeklyDigest(req.user.id);
      res.json({ data });
    },

    async preferences(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');
      const data = await digest.getPreferences(req.user.id);
      res.json({ data });
    },

    async updatePreferences(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const parsed = preferencesSchema.safeParse(req.body);
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR');
      }

      const data = await digest.updatePreferences(req.user.id, parsed.data);
      res.json({ data });
    },

    async sendEmail(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');
      const data = await digest.sendWeeklyEmail(req.user.id);
      res.json({ data });
    },

    async cronWeekly(req: Request, res: Response): Promise<void> {
      const secret = req.headers.authorization?.replace(/^Bearer\s+/i, '');
      const data = await digest.runWeeklyCron(secret);
      res.json({ data });
    },
  };
}
