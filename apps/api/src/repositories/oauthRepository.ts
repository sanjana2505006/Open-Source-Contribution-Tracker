import type pg from 'pg';

export type UpsertOAuthInput = {
  userId: string;
  providerAccountId: number;
  accessToken: string;
  scope: string | null;
};

export class OAuthRepository {
  constructor(private db: pg.Pool) {}

  async upsert(input: UpsertOAuthInput): Promise<void> {
    await this.db.query(
      `INSERT INTO oauth_accounts (user_id, provider, provider_account_id, access_token, scope)
       VALUES ($1, 'github', $2, $3, $4)
       ON CONFLICT (provider, provider_account_id) DO UPDATE SET
         user_id = EXCLUDED.user_id,
         access_token = EXCLUDED.access_token,
         scope = EXCLUDED.scope`,
      [input.userId, input.providerAccountId, input.accessToken, input.scope],
    );
  }
}
