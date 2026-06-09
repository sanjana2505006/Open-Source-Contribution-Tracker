import type { StatsSummary, WatchedContributor } from '@osct/shared';
import type pg from 'pg';

export class WatchlistRepository {
  constructor(private db: pg.Pool) {}

  async add(userId: string, cacheId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_watchlist (user_id, contributor_cache_id)
       VALUES ($1, $2)
       ON CONFLICT (user_id, contributor_cache_id) DO NOTHING`,
      [userId, cacheId],
    );
  }

  async remove(userId: string, username: string): Promise<boolean> {
    const result = await this.db.query(
      `DELETE FROM user_watchlist uw
       USING contributor_cache cc
       WHERE uw.contributor_cache_id = cc.id
         AND uw.user_id = $1
         AND cc.github_username = $2`,
      [userId, username],
    );
    return (result.rowCount ?? 0) > 0;
  }

  async list(userId: string): Promise<WatchedContributor[]> {
    const result = await this.db.query<{
      github_username: string;
      display_name: string | null;
      avatar_url: string | null;
      stats: StatsSummary;
      synced_at: Date;
    }>(
      `SELECT cc.github_username, cc.display_name, cc.avatar_url, cc.stats, cc.synced_at
       FROM user_watchlist uw
       JOIN contributor_cache cc ON cc.id = uw.contributor_cache_id
       WHERE uw.user_id = $1
       ORDER BY uw.created_at DESC`,
      [userId],
    );

    return result.rows.map((row) => ({
      username: row.github_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      stats: row.stats,
      syncedAt: row.synced_at.toISOString(),
    }));
  }
}
