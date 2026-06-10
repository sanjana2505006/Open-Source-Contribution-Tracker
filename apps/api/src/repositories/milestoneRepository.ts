import type { MilestoneType } from '@osct/shared';
import type pg from 'pg';

export type UpsertMilestoneInput = {
  userId: string;
  type: MilestoneType;
  title: string;
  description?: string | null;
  occurredAt: Date;
  contributionId?: string | null;
  repositoryId?: string | null;
  metadata?: Record<string, unknown> | null;
};

export type MilestoneRow = {
  id: string;
  type: MilestoneType;
  title: string;
  description: string | null;
  occurred_at: Date;
  contribution_id: string | null;
  repository_id: string | null;
  html_url: string | null;
  full_name: string | null;
};

export class MilestoneRepository {
  constructor(private db: pg.Pool) {}

  async upsert(input: UpsertMilestoneInput): Promise<void> {
    await this.db.query(
      `INSERT INTO milestones (
         user_id, type, title, description, occurred_at, contribution_id, repository_id, metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (user_id, type) DO UPDATE SET
         title = EXCLUDED.title,
         description = EXCLUDED.description,
         occurred_at = EXCLUDED.occurred_at,
         contribution_id = EXCLUDED.contribution_id,
         repository_id = EXCLUDED.repository_id,
         metadata = EXCLUDED.metadata`,
      [
        input.userId,
        input.type,
        input.title,
        input.description ?? null,
        input.occurredAt,
        input.contributionId ?? null,
        input.repositoryId ?? null,
        input.metadata ? JSON.stringify(input.metadata) : null,
      ],
    );
  }

  async listByUser(userId: string): Promise<MilestoneRow[]> {
    const result = await this.db.query<MilestoneRow>(
      `SELECT
         m.id,
         m.type,
         m.title,
         m.description,
         m.occurred_at,
         m.contribution_id,
         m.repository_id,
         COALESCE(c.html_url, r.html_url, m.metadata->>'profileUrl') AS html_url,
         r.full_name
       FROM milestones m
       LEFT JOIN contributions c ON c.id = m.contribution_id
       LEFT JOIN repositories r ON r.id = m.repository_id
       WHERE m.user_id = $1
       ORDER BY m.occurred_at ASC, m.created_at ASC`,
      [userId],
    );
    return result.rows;
  }
}
