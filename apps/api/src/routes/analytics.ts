import type { Request, Response } from 'express';
import type { AnalyticsService } from '../services/analyticsService.js';
import type { HeatmapService } from '../services/heatmapService.js';
import { AppError } from '../middleware/errorHandler.js';

export function createAnalyticsRoutes(
  analytics: AnalyticsService,
  heatmap: HeatmapService,
) {
  return {
    async bundle(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const from = typeof req.query.from === 'string' ? req.query.from : undefined;
      const to = typeof req.query.to === 'string' ? req.query.to : undefined;

      try {
        const data = await analytics.getAnalytics(req.user.id, from, to);
        res.json({ data });
      } catch (err) {
        if (err instanceof Error && err.message === 'Invalid date range') {
          throw new AppError(400, err.message, 'INVALID_RANGE');
        }
        throw err;
      }
    },

    async heatmap(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const yearParam =
        typeof req.query.year === 'string' ? Number.parseInt(req.query.year, 10) : undefined;
      const year = Number.isFinite(yearParam) ? yearParam : undefined;

      try {
        const data = await heatmap.getHeatmap(req.user.id, year);
        res.json({ data });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load heatmap';
        throw new AppError(502, message, 'HEATMAP_FAILED');
      }
    },
  };
}
