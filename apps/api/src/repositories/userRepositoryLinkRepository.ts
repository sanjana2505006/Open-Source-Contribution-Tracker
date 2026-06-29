import type { RepositorySummary, StatsSummary } from '@osct/shared';
import type pg from 'pg';

export class UserRepositoryLinkRepository {
  constructor(private db: pg.Pool) {}

  async linkRepoOnly(userId: string, repositoryId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_repositories (user_id, repository_id, contribution_count)
       VALUES ($1, $2, 0)
       ON CONFLICT (user_id, repository_id) DO NOTHING`,
      [userId, repositoryId],
    );
  }

  async rebuildFromContributions(userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO user_repositories (user_id, repository_id, first_contributed_at, last_contributed_at, contribution_count)
       SELECT user_id, repository_id, MIN(occurred_at), MAX(occurred_at), COUNT(*)::integer
       FROM contributions
       WHERE user_id = $1
       GROUP BY user_id, repository_id
       ON CONFLICT (user_id, repository_id) DO UPDATE SET
         first_contributed_at = EXCLUDED.first_contributed_at,
         last_contributed_at = EXCLUDED.last_contributed_at,
         contribution_count = EXCLUDED.contribution_count`,
      [userId],
    );
  }

  async countRepos(userId: string): Promise<number> {
    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM user_repositories WHERE user_id = $1`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async userHasRepo(userId: string, fullName: string): Promise<boolean> {
    const result = await this.db.query<{ exists: boolean }>(
      `SELECT EXISTS (
         SELECT 1
         FROM user_repositories ur
         JOIN repositories r ON r.id = ur.repository_id
         WHERE ur.user_id = $1 AND LOWER(r.full_name) = LOWER($2)
       ) AS exists`,
      [userId, fullName],
    );
    return Boolean(result.rows[0]?.exists);
  }

  async listForUser(userId: string, limit = 100): Promise<RepositorySummary[]> {
    const result = await this.db.query<{
      id: string;
      full_name: string;
      primary_language: string | null;
      html_url: string;
      contribution_count: number;
      last_contributed_at: Date | null;
    }>(
      `SELECT r.id, r.full_name, r.primary_language, r.html_url,
              ur.contribution_count, ur.last_contributed_at
       FROM user_repositories ur
       JOIN repositories r ON r.id = ur.repository_id
       WHERE ur.user_id = $1
       ORDER BY ur.last_contributed_at DESC NULLS LAST, r.full_name
       LIMIT $2`,
      [userId, limit],
    );

    return result.rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      primaryLanguage: row.primary_language,
      htmlUrl: row.html_url,
      contributionCount: row.contribution_count,
      lastContributedAt: row.last_contributed_at?.toISOString() ?? null,
    }));
  }

  async getStats(userId: string): Promise<StatsSummary> {
    const repoCount = await this.countRepos(userId);

    const counts = await this.db.query<{ type: string; count: string }>(
      `SELECT type,
              CASE
                WHEN type = 'commit' THEN COALESCE(
                  SUM(COALESCE((raw_metadata->>'commitCount')::int, 1)),
                  0
                )::text
                ELSE COUNT(*)::text
              END AS count
       FROM contributions WHERE user_id = $1
       GROUP BY type`,
      [userId],
    );

    const byType = Object.fromEntries(
      counts.rows.map((r) => [r.type, Number(r.count)]),
    );

    return {
      repositories: repoCount,
      pullRequests: byType.pull_request ?? 0,
      commits: byType.commit ?? 0,
      issues: byType.issue ?? 0,
    };
  }
}
