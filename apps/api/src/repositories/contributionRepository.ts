import type pg from 'pg';

export type UpsertContributionInput = {
  userId: string;
  repositoryId: string;
  githubId: number;
  type: 'commit' | 'pull_request' | 'issue';
  title: string;
  state: 'open' | 'closed' | 'merged' | null;
  isMerged: boolean | null;
  occurredAt: Date;
  htmlUrl: string;
  roles?: string[];
  commitCount?: number;
};

export class ContributionRepository {
  constructor(private db: pg.Pool) {}

  async upsert(input: UpsertContributionInput): Promise<void> {
    let metadata: string | null = null;

    if (input.type === 'issue' && input.roles?.length) {
      metadata = JSON.stringify({ roles: input.roles });
    } else if (input.type === 'commit' && input.commitCount && input.commitCount > 1) {
      metadata = JSON.stringify({ commitCount: input.commitCount });
    }

    await this.db.query(
      `INSERT INTO contributions (
         user_id, repository_id, github_id, type, title, state, is_merged, occurred_at, html_url, raw_metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)
       ON CONFLICT (user_id, type, github_id) DO UPDATE SET
         title = EXCLUDED.title,
         state = EXCLUDED.state,
         is_merged = EXCLUDED.is_merged,
         occurred_at = EXCLUDED.occurred_at,
         html_url = EXCLUDED.html_url,
         raw_metadata = CASE
           WHEN EXCLUDED.raw_metadata IS NULL THEN contributions.raw_metadata
           WHEN contributions.raw_metadata IS NULL THEN EXCLUDED.raw_metadata
           ELSE jsonb_build_object(
             'roles',
             (
               SELECT COALESCE(jsonb_agg(DISTINCT value), '[]'::jsonb)
               FROM jsonb_array_elements(
                 COALESCE(contributions.raw_metadata->'roles', '[]'::jsonb)
                 || COALESCE(EXCLUDED.raw_metadata->'roles', '[]'::jsonb)
               ) AS value
             )
           )
         END`,
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
        metadata,
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

  private statusFilterSql(status?: string): string {
    switch (status) {
      case 'open':
        return ` AND c.state = 'open' AND COALESCE(c.is_merged, FALSE) = FALSE`;
      case 'merged':
        return ` AND (c.is_merged = TRUE OR c.state = 'merged')`;
      case 'closed':
        return ` AND c.state = 'closed' AND COALESCE(c.is_merged, FALSE) = FALSE`;
      default:
        return '';
    }
  }

  async countPullRequestsByStatus(
    userId: string,
    repo?: string,
  ): Promise<{ all: number; open: number; merged: number; closed: number }> {
    const params: unknown[] = [userId];
    let repoFilter = '';

    if (repo) {
      params.push(repo.toLowerCase());
      repoFilter = ` AND LOWER(r.full_name) = $${params.length}`;
    }

    const result = await this.db.query<{
      all: string;
      open: string;
      merged: string;
      closed: string;
    }>(
      `SELECT
         COUNT(*)::text AS all,
         COUNT(*) FILTER (
           WHERE c.state = 'open' AND COALESCE(c.is_merged, FALSE) = FALSE
         )::text AS open,
         COUNT(*) FILTER (
           WHERE c.is_merged = TRUE OR c.state = 'merged'
         )::text AS merged,
         COUNT(*) FILTER (
           WHERE c.state = 'closed' AND COALESCE(c.is_merged, FALSE) = FALSE
         )::text AS closed
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'pull_request'${repoFilter}`,
      params,
    );

    const row = result.rows[0];
    return {
      all: Number(row?.all ?? 0),
      open: Number(row?.open ?? 0),
      merged: Number(row?.merged ?? 0),
      closed: Number(row?.closed ?? 0),
    };
  }

  async listPullRequests(
    userId: string,
    opts: {
      repo?: string;
      status?: string;
      sort?: 'newest' | 'oldest';
      limit?: number;
      offset?: number;
    },
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

    const statusFilter = this.statusFilterSql(opts.status);
    const order =
      opts.sort === 'oldest' ? 'c.occurred_at ASC, c.id ASC' : 'c.occurred_at DESC, c.id DESC';

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'pull_request'${repoFilter}${statusFilter}`,
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
       WHERE c.user_id = $1 AND c.type = 'pull_request'${repoFilter}${statusFilter}
       ORDER BY ${order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: result.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  private issueStatusFilterSql(status?: string): string {
    switch (status) {
      case 'open':
        return ` AND c.state = 'open'`;
      case 'closed':
        return ` AND c.state = 'closed'`;
      default:
        return '';
    }
  }

  private issueRoleFilterSql(roleParamIndex: number): string {
    return ` AND COALESCE(c.raw_metadata->'roles', '[]'::jsonb) @> to_jsonb(ARRAY[$${roleParamIndex}]::text[])`;
  }

  async countIssues(
    userId: string,
    repo?: string,
  ): Promise<{ all: number; open: number; closed: number; assigned: number; authored: number; commented: number }> {
    const params: unknown[] = [userId];
    let repoFilter = '';

    if (repo) {
      params.push(repo.toLowerCase());
      repoFilter = ` AND LOWER(r.full_name) = $${params.length}`;
    }

    const result = await this.db.query<{
      all: string;
      open: string;
      closed: string;
      assigned: string;
      authored: string;
      commented: string;
    }>(
      `SELECT
         COUNT(*)::text AS all,
         COUNT(*) FILTER (WHERE c.state = 'open')::text AS open,
         COUNT(*) FILTER (WHERE c.state = 'closed')::text AS closed,
         COUNT(*) FILTER (
           WHERE COALESCE(c.raw_metadata->'roles', '[]'::jsonb) @> '["assigned"]'::jsonb
         )::text AS assigned,
         COUNT(*) FILTER (
           WHERE COALESCE(c.raw_metadata->'roles', '[]'::jsonb) @> '["authored"]'::jsonb
         )::text AS authored,
         COUNT(*) FILTER (
           WHERE COALESCE(c.raw_metadata->'roles', '[]'::jsonb) @> '["commented"]'::jsonb
         )::text AS commented
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'issue'${repoFilter}`,
      params,
    );

    const row = result.rows[0];
    return {
      all: Number(row?.all ?? 0),
      open: Number(row?.open ?? 0),
      closed: Number(row?.closed ?? 0),
      assigned: Number(row?.assigned ?? 0),
      authored: Number(row?.authored ?? 0),
      commented: Number(row?.commented ?? 0),
    };
  }

  async listIssues(
    userId: string,
    opts: {
      repo?: string;
      role?: string;
      status?: string;
      sort?: 'newest' | 'oldest';
      limit?: number;
      offset?: number;
    },
  ): Promise<{
    items: Array<{
      id: string;
      title: string;
      state: string | null;
      occurred_at: Date;
      html_url: string;
      full_name: string;
      raw_metadata: { roles?: string[] } | null;
    }>;
    total: number;
  }> {
    const limit = Math.min(opts.limit ?? 100, 500);
    const offset = opts.offset ?? 0;
    const params: unknown[] = [userId];
    let repoFilter = '';
    let roleFilter = '';

    if (opts.repo) {
      params.push(opts.repo.toLowerCase());
      repoFilter = ` AND LOWER(r.full_name) = $${params.length}`;
    }

    if (opts.role && opts.role !== 'all') {
      params.push(opts.role);
      roleFilter = this.issueRoleFilterSql(params.length);
    }

    const statusFilter = this.issueStatusFilterSql(opts.status);
    const order =
      opts.sort === 'oldest' ? 'c.occurred_at ASC, c.id ASC' : 'c.occurred_at DESC, c.id DESC';

    const countResult = await this.db.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'issue'${repoFilter}${roleFilter}${statusFilter}`,
      params,
    );

    params.push(limit, offset);
    const result = await this.db.query<{
      id: string;
      title: string;
      state: string | null;
      occurred_at: Date;
      html_url: string;
      full_name: string;
      raw_metadata: { roles?: string[] } | null;
    }>(
      `SELECT c.id, c.title, c.state, c.occurred_at, c.html_url, r.full_name, c.raw_metadata
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 AND c.type = 'issue'${repoFilter}${roleFilter}${statusFilter}
       ORDER BY ${order}
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );

    return {
      items: result.rows,
      total: Number(countResult.rows[0]?.count ?? 0),
    };
  }

  async findAtPosition(
    userId: string,
    position: number,
    opts?: { type?: 'commit' | 'pull_request'; mergedOnly?: boolean },
  ): Promise<{
    id: string;
    title: string | null;
    type: string;
    occurred_at: Date;
    html_url: string;
    repository_id: string;
    full_name: string;
  } | null> {
    if (position < 1) return null;

    const params: unknown[] = [userId];
    const filters: string[] = [];

    if (opts?.type) {
      params.push(opts.type);
      filters.push(`AND c.type = $${params.length}`);
    }

    if (opts?.mergedOnly) {
      filters.push('AND c.is_merged = TRUE');
    }

    const offset = position - 1;
    params.push(offset);

    const result = await this.db.query<{
      id: string;
      title: string | null;
      type: string;
      occurred_at: Date;
      html_url: string;
      repository_id: string;
      full_name: string;
    }>(
      `SELECT c.id, c.title, c.type::text, c.occurred_at, c.html_url, c.repository_id, r.full_name
       FROM contributions c
       JOIN repositories r ON r.id = c.repository_id
       WHERE c.user_id = $1 ${filters.join(' ')}
       ORDER BY c.occurred_at ASC, c.id ASC
       LIMIT 1 OFFSET $${params.length}`,
      params,
    );

    return result.rows[0] ?? null;
  }
}
