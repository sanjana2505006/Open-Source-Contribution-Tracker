import type {
  AnalyticsBundle,
  ContributionTimelinePoint,
  LanguageStat,
  PullRequestStats,
} from '@osct/shared';
import type pg from 'pg';

export type DateRange = {
  from: Date;
  to: Date;
};

export class AnalyticsRepository {
  constructor(private db: pg.Pool) {}

  async getTimeline(userId: string, range: DateRange): Promise<ContributionTimelinePoint[]> {
    const result = await this.db.query<{
      period: Date;
      pull_requests: string;
      commits: string;
      total: string;
    }>(
      `SELECT DATE_TRUNC('month', occurred_at) AS period,
              COUNT(*) FILTER (WHERE type = 'pull_request')::text AS pull_requests,
              COALESCE(
                SUM(COALESCE((raw_metadata->>'commitCount')::int, 1)) FILTER (WHERE type = 'commit'),
                0
              )::text AS commits,
              COUNT(*)::text AS total
       FROM contributions
       WHERE user_id = $1
         AND occurred_at >= $2
         AND occurred_at <= $3
       GROUP BY period
       ORDER BY period`,
      [userId, range.from, range.to],
    );

    return result.rows.map((row) => ({
      period: row.period.toISOString().slice(0, 10),
      pullRequests: Number(row.pull_requests),
      commits: Number(row.commits),
      total: Number(row.total),
    }));
  }

  async getPullRequestStats(userId: string, range: DateRange): Promise<PullRequestStats> {
    const result = await this.db.query<{
      open: string;
      closed: string;
      merged: string;
      total: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE state = 'open')::text AS open,
         COUNT(*) FILTER (WHERE state = 'closed' AND COALESCE(is_merged, false) = false)::text AS closed,
         COUNT(*) FILTER (WHERE state = 'merged' OR is_merged = true)::text AS merged,
         COUNT(*)::text AS total
       FROM contributions
       WHERE user_id = $1
         AND type = 'pull_request'
         AND occurred_at >= $2
         AND occurred_at <= $3`,
      [userId, range.from, range.to],
    );

    const row = result.rows[0]!;
    return {
      open: Number(row.open),
      closed: Number(row.closed),
      merged: Number(row.merged),
      total: Number(row.total),
    };
  }

  async getLanguageStats(userId: string, range: DateRange): Promise<LanguageStat[]> {
    const result = await this.db.query<{ language: string; count: string }>(
      `SELECT r.primary_language AS language, COUNT(c.id)::text AS count
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1
         AND r.primary_language IS NOT NULL
         AND c.occurred_at >= $2
         AND c.occurred_at <= $3
       GROUP BY r.primary_language
       ORDER BY COUNT(c.id) DESC
       LIMIT 10`,
      [userId, range.from, range.to],
    );

    return result.rows.map((row) => ({
      language: row.language,
      count: Number(row.count),
    }));
  }

  async getBundle(userId: string, range: DateRange): Promise<AnalyticsBundle> {
    const [timeline, pullRequests, languages] = await Promise.all([
      this.getTimeline(userId, range),
      this.getPullRequestStats(userId, range),
      this.getLanguageStats(userId, range),
    ]);

    return {
      range: {
        from: range.from.toISOString().slice(0, 10),
        to: range.to.toISOString().slice(0, 10),
      },
      timeline,
      pullRequests,
      languages,
    };
  }
}
