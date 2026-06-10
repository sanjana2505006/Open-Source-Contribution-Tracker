import type pg from 'pg';

export type UpsertContributionInput = {
  userId: string;
  repositoryId: string;
  githubId: number;
  type: 'commit' | 'pull_request';
  title: string;
  state: 'open' | 'closed' | 'merged' | null;
  isMerged: boolean | null;
  occurredAt: Date;
  htmlUrl: string;
};

export class ContributionRepository {
  constructor(private db: pg.Pool) {}

  async upsert(input: UpsertContributionInput): Promise<void> {
    await this.db.query(
      `INSERT INTO contributions (
         user_id, repository_id, github_id, type, title, state, is_merged, occurred_at, html_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       ON CONFLICT (user_id, type, github_id) DO UPDATE SET
         title = EXCLUDED.title,
         state = EXCLUDED.state,
         is_merged = EXCLUDED.is_merged,
         occurred_at = EXCLUDED.occurred_at,
         html_url = EXCLUDED.html_url`,
      [
        input.userId,
        input.repositoryId,
        input.githubId,
        input.type,
        input.title,
        input.state,
        input.isMerged,
        input.occurredAt,
        input.htmlUrl,
      ],
    );
  }

  async countByUser(userId: string, type?: string): Promise<number> {
    if (type) {
      const result = await this.db.query<{ count: string }>(
        `SELECT COUNT(*)::text AS count FROM contributions WHERE user_id = $1 AND type = $2`,
        [userId, type],
      );
      return Number(result.rows[0]?.count ?? 0);
    }

    const result = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM contributions WHERE user_id = $1`,
      [userId],
    );
    return Number(result.rows[0]?.count ?? 0);
  }

  async listPullRequests(
    userId: string,
    opts: { repo?: string; limit?: number; offset?: number },
  ): Promise<{ items: Array<{
    id: string;
    title: string;
    state: string | null;
    is_merged: boolean | null;
    occurred_at: Date;
    html_url: string;
    full_name: string;
  }>; total: number }> {
    const limit = Math.min(opts.limit ?? 100, 500);
    const offset = opts.offset ?? 0;
    const params: unknown[] = [userId];
    let repoFilter = '';

    if (opts.repo) {
      params.push(opts.repo.toLowerCase());
      repoFilter = ` AND LOWER(r.full_name) = $${params.length}`;
    }

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'pull_request'${repoFilter}`,
      params,
    );

    params.push(limit, offset);
    const result = await this.db.query<{
      id: string;
      title: string;
      state: string | null;
      is_merged: boolean | null;
      occurred_at: Date;
      html_url: string;
      full_name: string;
    }>(
      `SELECT c.id, c.title, c.state, c.is_merged, c.occurred_at, c.html_url, r.full_name
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'pull_request'${repoFilter}
       ORDER BY c.occurred_at DESC
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: result.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }
}
