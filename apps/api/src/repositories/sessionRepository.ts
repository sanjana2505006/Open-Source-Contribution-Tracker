import type pg from 'pg';

export type DbSession = {
  id: string;
  user_id: string;
  session_token: string;
  expires_at: Date;
};

export class SessionRepository {
  constructor(private db: pg.Pool) {}

  async create(userId: string, sessionToken: string, expiresAt: Date): Promise<void> {
    await this.db.query(
      `INSERT INTO sessions (user_id, session_token, expires_at) VALUES ($1, $2, $3)`,
      [userId, sessionToken, expiresAt],
    );
  }

  async findByToken(sessionToken: string): Promise<DbSession | null> {
    const result = await this.db.query<DbSession>(
      `SELECT id, user_id, session_token, expires_at
       FROM sessions
       WHERE session_token = $1 AND expires_at > NOW()`,
      [sessionToken],
    );
    return result.rows[0] ?? null;
  }

  async deleteByToken(sessionToken: string): Promise<void> {
    await this.db.query(`DELETE FROM sessions WHERE session_token = $1`, [
      sessionToken,
    ]);
  }
}
