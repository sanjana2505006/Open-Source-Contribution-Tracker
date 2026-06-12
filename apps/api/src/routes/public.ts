import type { Request, Response } from 'express';
import type { ExploreService } from '../services/exploreService.js';
import type { PortfolioHighlightsService } from '../services/portfolioHighlightsService.js';
import { AppError } from '../middleware/errorHandler.js';
import { RateLimitError } from '../services/exploreService.js';

export function createPublicRoutes(
  explore: ExploreService,
  highlights: PortfolioHighlightsService,
) {
  return {
    async profile(req: Request, res: Response): Promise<void> {
      const username = req.params.username;
      if (!username) throw new AppError(400, 'Username required', 'BAD_REQUEST');

      try {
        const [profile, portfolioHighlights] = await Promise.all([
          explore.publicLookup(username),
          highlights.getHighlights(username).catch(() => null),
        ]);

        res.json({
          data: {
            ...profile,
            ...(portfolioHighlights ? { highlights: portfolioHighlights } : {}),
          },
        });
      } catch (err) {
        if (err instanceof RateLimitError) {
          throw new AppError(429, 'GitHub rate limit hit — try again later', 'RATE_LIMIT');
        }
        if (err instanceof Error) {
          if (err.message.includes('not found')) {
            throw new AppError(404, err.message, 'NOT_FOUND');
          }
          if (err.message.includes('not available')) {
            throw new AppError(
              404,
              'Portfolio not published yet — sign in and sync to create a public link.',
              'PROFILE_NOT_PUBLISHED',
            );
          }
          if (err.message.includes('Invalid GitHub')) {
            throw new AppError(400, err.message, 'INVALID_USERNAME');
          }
        }
        throw err;
      }
    },
  };
}
