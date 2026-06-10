import type { Request, Response } from 'express';
import type { JourneyService } from '../services/journeyService.js';
import { AppError } from '../middleware/errorHandler.js';

export function createJourneyRoutes(journey: JourneyService) {
  return {
    async bundle(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const data = await journey.getJourney(req.user.id);
      res.json({ data });
    },
  };
}
