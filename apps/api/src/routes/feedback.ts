import type { Request, Response } from 'express';
import { z } from 'zod';
import { AppError } from '../middleware/errorHandler.js';
import { FeedbackRepository } from '../repositories/feedbackRepository.js';

const submitSchema = z.object({
  category: z.enum(['bug', 'feature', 'general', 'praise']),
  message: z.string().trim().min(10, 'Please write at least 10 characters').max(2000),
  email: z.string().trim().email().max(320).optional().or(z.literal('')),
  rating: z.number().int().min(1).max(5).optional(),
  pageUrl: z.string().trim().max(500).optional(),
});

export function createFeedbackRoutes(db: import('pg').Pool) {
  const feedback = new FeedbackRepository(db);

  return {
    async submit(req: Request, res: Response): Promise<void> {
      const parsed = submitSchema.safeParse(req.body);
      if (!parsed.success) {
        const message = parsed.error.issues[0]?.message ?? 'Invalid feedback';
        throw new AppError(400, message, 'VALIDATION_ERROR');
      }

      const body = parsed.data;
      const item = await feedback.create({
        userId: req.user?.id ?? null,
        username: req.user?.username ?? null,
        email: body.email || null,
        category: body.category,
        message: body.message,
        rating: body.rating ?? null,
        pageUrl: body.pageUrl ?? null,
      });

      res.status(201).json({ data: item });
    },
  };
}
