import type pg from 'pg';
import { decryptToken } from '../infrastructure/auth/crypto.js';

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

  async getEncryptedToken(userId: string): Promise<string | null> {
    const result = await this.db.query<{ access_token: string }>(
      `SELECT access_token FROM oauth_accounts WHERE user_id = $1 AND provider = 'github'`,
      [userId],
    );
    return result.rows[0]?.access_token ?? null;
  }

  async getAccessToken(userId: string, secret: string): Promise<string | null> {
    const encrypted = await this.getEncryptedToken(userId);
    if (!encrypted) return null;
    return decryptToken(encrypted, secret);
  }
}
