import type { AnalyticsBundle } from '@osct/shared';
import type pg from 'pg';
import { AnalyticsRepository, type DateRange } from '../repositories/analyticsRepository.js';

function defaultRange(): DateRange {
  const to = new Date();
  const from = new Date(to);
  from.setFullYear(from.getFullYear() - 1);
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}

function parseRange(fromParam?: string, toParam?: string): DateRange {
  if (!fromParam && !toParam) return defaultRange();

  const to = toParam ? new Date(`${toParam}T23:59:59.999Z`) : new Date();
  const from = fromParam
    ? new Date(`${fromParam}T00:00:00.000Z`)
    : new Date(to.getTime() - 365 * 24 * 60 * 60 * 1000);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('Invalid date range');
  }

  return { from, to };
}

export class AnalyticsService {
  private analytics: AnalyticsRepository;

  constructor(db: pg.Pool) {
    this.analytics = new AnalyticsRepository(db);
  }

  getAnalytics(
    userId: string,
    from?: string,
    to?: string,
  ): Promise<AnalyticsBundle> {
    const range = parseRange(from, to);
    return this.analytics.getBundle(userId, range);
  }
}
