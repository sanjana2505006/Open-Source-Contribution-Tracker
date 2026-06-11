import type pg from 'pg';
import type { ClientInfo } from '../lib/clientInfo.js';

export type DbSession = {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
};

export class SessionRepository {
  constructor(private db: pg.Pool) {}

  async create(
    userId: string,
    sessionToken: string,
    expiresAt: Date,
    client?: ClientInfo,
  ): Promise<string> {
    const result = await this.db.query<{ id: string }>(
      `INSERT INTO sessions (
         user_id, session_token, expires_at, last_seen_at, ip_address, user_agent
       ) VALUES ($1, $2, $3, NOW(), $4, $5)
       RETURNING id`,
      [userId, sessionToken, expiresAt, client?.ipAddress ?? null, client?.userAgent ?? null],
    );
    return result.rows[0]!.id;
  }

  async findByToken(sessionToken: string): Promise<DbSession | null> {
    const result = await this.db.query<DbSession>(
      `SELECT id, user_id, session_token, expires_at
       FROM sessions
       WHERE session_token = $1
         AND ended_at IS NULL
         AND expires_at > NOW()`,
      [sessionToken],
    );
    return result.rows[0] ?? null;
  }

  async touch(sessionId: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions SET last_seen_at = NOW() WHERE id = $1 AND ended_at IS NULL`,
      [sessionId],
    );
  }

  async end(sessionToken: string): Promise<void> {
    await this.db.query(
      `UPDATE sessions SET
         ended_at = NOW(),
         duration_seconds = GREATEST(
           0,
           EXTRACT(EPOCH FROM (COALESCE(last_seen_at, NOW()) - created_at))::integer
         ),
         last_seen_at = COALESCE(last_seen_at, NOW())
       WHERE session_token = $1 AND ended_at IS NULL`,
      [sessionToken],
    );
  }
}
