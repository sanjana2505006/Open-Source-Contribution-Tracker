import type { SyncJobStatus, SyncStatus } from '@osct/shared';
import type pg from 'pg';

type DbSyncJob = {
  id: string;
  user_id: string;
  status: SyncJobStatus;
  repos_synced: number;
  repos_failed: number;
  started_at: Date | null;
  completed_at: Date | null;
  error_message: string | null;
  created_at: Date;
};

function toSyncStatus(row: DbSyncJob): SyncStatus {
  return {
    id: row.id,
    status: row.status,
    reposSynced: row.repos_synced,
    reposFailed: row.repos_failed,
    startedAt: row.started_at?.toISOString() ?? null,
    completedAt: row.completed_at?.toISOString() ?? null,
    errorMessage: row.error_message,
  };
}

export class SyncJobRepository {
  constructor(private db: pg.Pool) {}

  async create(userId: string): Promise<SyncStatus> {
    const result = await this.db.query<DbSyncJob>(
      `INSERT INTO sync_jobs (user_id, status, started_at)
       VALUES ($1, 'running', NOW())
       RETURNING id, user_id, status, repos_synced, repos_failed, started_at, completed_at, error_message, created_at`,
      [userId],
    );
    return toSyncStatus(result.rows[0]!);
  }

  async findRunning(userId: string): Promise<SyncStatus | null> {
    await this.expireStaleRunning(userId);

    const result = await this.db.query<DbSyncJob>(
      `SELECT id, user_id, status, repos_synced, repos_failed, started_at, completed_at, error_message, created_at
       FROM sync_jobs
       WHERE user_id = $1 AND status = 'running'
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? toSyncStatus(result.rows[0]) : null;
  }

  async findLatest(userId: string): Promise<SyncStatus | null> {
    await this.expireStaleRunning(userId);

    const result = await this.db.query<DbSyncJob>(
      `SELECT id, user_id, status, repos_synced, repos_failed, started_at, completed_at, error_message, created_at
       FROM sync_jobs
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 1`,
      [userId],
    );
    return result.rows[0] ? toSyncStatus(result.rows[0]) : null;
  }

  async updateProgress(
    jobId: string,
    reposSynced: number,
    reposFailed: number,
  ): Promise<void> {
    await this.db.query(
      `UPDATE sync_jobs SET repos_synced = $2, repos_failed = $3 WHERE id = $1`,
      [jobId, reposSynced, reposFailed],
    );
  }

  async complete(
    jobId: string,
    status: SyncJobStatus,
    errorMessage: string | null,
    rateLimitResetAt: Date | null,
  ): Promise<void> {
    await this.db.query(
      `UPDATE sync_jobs
       SET status = $2, completed_at = NOW(), error_message = $3, rate_limit_reset_at = $4
       WHERE id = $1`,
      [jobId, status, errorMessage, rateLimitResetAt],
    );
  }

  /** Render can kill long background syncs — don't leave jobs stuck in `running`. */
  async expireStaleRunning(userId: string, maxAgeMinutes = 1): Promise<number> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE sync_jobs
       SET status = 'failed',
           completed_at = NOW(),
           error_message = 'Sync timed out — click Sync from GitHub again'
       WHERE user_id = $1
         AND status = 'running'
         AND started_at < NOW() - ($2::text || ' minutes')::interval
       RETURNING id`,
      [userId, maxAgeMinutes],
    );
    return result.rowCount ?? 0;
  }

  /** Force-fail any in-flight sync so the user can start fresh. */
  async cancelRunning(userId: string, reason = 'Sync cancelled'): Promise<number> {
    const result = await this.db.query<{ id: string }>(
      `UPDATE sync_jobs
       SET status = 'failed',
           completed_at = NOW(),
           error_message = $2
       WHERE user_id = $1 AND status = 'running'
       RETURNING id`,
      [userId, reason],
    );
    return result.rowCount ?? 0;
  }
}
