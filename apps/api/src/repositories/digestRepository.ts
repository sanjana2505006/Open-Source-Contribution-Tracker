import type pg from 'pg';

export type DigestPreferencesRow = {
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  last_email_sent_at: Date | null;
  updated_at: Date;
};

export class DigestRepository {
  constructor(private db: pg.Pool) {}

  async getPreferences(userId: string): Promise<DigestPreferencesRow | null> {
    const result = await this.db.query<DigestPreferencesRow>(
      `SELECT user_id, email_enabled, in_app_enabled, last_email_sent_at, updated_at
       FROM digest_preferences
       WHERE user_id = $1`,
      [userId],
    );
    return result.rows[0] ?? null;
  }

  async upsertPreferences(input: {
    userId: string;
    emailEnabled?: boolean;
    inAppEnabled?: boolean;
  }): Promise<DigestPreferencesRow> {
    const existing = await this.getPreferences(input.userId);

    const emailEnabled = input.emailEnabled ?? existing?.email_enabled ?? false;
    const inAppEnabled = input.inAppEnabled ?? existing?.in_app_enabled ?? true;

    const result = await this.db.query<DigestPreferencesRow>(
      `INSERT INTO digest_preferences (user_id, email_enabled, in_app_enabled)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET
         email_enabled = EXCLUDED.email_enabled,
         in_app_enabled = EXCLUDED.in_app_enabled,
         updated_at = NOW()
       RETURNING user_id, email_enabled, in_app_enabled, last_email_sent_at, updated_at`,
      [input.userId, emailEnabled, inAppEnabled],
    );
    return result.rows[0]!;
  }

  async markEmailSent(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE digest_preferences
       SET last_email_sent_at = NOW(), updated_at = NOW()
       WHERE user_id = $1`,
      [userId],
    );
  }

  async listEmailEnabledUserIds(): Promise<string[]> {
    const result = await this.db.query<{ user_id: string }>(
      `SELECT user_id FROM digest_preferences WHERE email_enabled = true`,
    );
    return result.rows.map((row) => row.user_id);
  }
}
