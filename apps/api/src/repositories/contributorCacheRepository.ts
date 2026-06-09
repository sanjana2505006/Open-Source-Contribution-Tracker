import type { ContributorProfile } from '@osct/shared';
import type pg from 'pg';

type CacheRow = {
  github_username: string;
  github_id: string | null;
  display_name: string | null;
  avatar_url: string | null;
  profile_url: string;
  stats: ContributorProfile['stats'];
  repositories: ContributorProfile['repositories'];
  analytics: ContributorProfile['analytics'];
  synced_at: Date;
};

export class ContributorCacheRepository {
  constructor(private db: pg.Pool) {}

  async upsert(profile: ContributorProfile, githubId: number | null): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO contributor_cache (
         github_username, github_id, display_name, avatar_url, profile_url,
         stats, repositories, analytics, synced_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
       ON CONFLICT (github_username) DO UPDATE SET
         github_id = EXCLUDED.github_id,
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         profile_url = EXCLUDED.profile_url,
         stats = EXCLUDED.stats,
         repositories = EXCLUDED.repositories,
         analytics = EXCLUDED.analytics,
         synced_at = NOW()
       RETURNING id`,
      [
        profile.username,
        githubId,
        profile.displayName,
        profile.avatarUrl,
        profile.profileUrl,
        JSON.stringify(profile.stats),
        JSON.stringify(profile.repositories),
        JSON.stringify(profile.analytics),
      ],
    );
    return result.rows[0]!.id;
  }

  async findByUsername(username: string): Promise<ContributorProfile | null> {
    const result = await this.db.query<CacheRow>(
      `SELECT github_username, github_id, display_name, avatar_url, profile_url,
              stats, repositories, analytics, synced_at
       FROM contributor_cache WHERE github_username = $1`,
      [username],
    );
    const row = result.rows[0];
    if (!row) return null;

    return {
      username: row.github_username,
      displayName: row.display_name,
      avatarUrl: row.avatar_url,
      profileUrl: row.profile_url,
      stats: row.stats,
      repositories: row.repositories,
      analytics: row.analytics,
      syncedAt: row.synced_at.toISOString(),
    };
  }

  async getIdByUsername(username: string): Promise<string | null> {
    const result = await this.db.query<{ id: string }>(
      `SELECT id FROM contributor_cache WHERE github_username = $1`,
      [username],
    );
    return result.rows[0]?.id ?? null;
  }
}
