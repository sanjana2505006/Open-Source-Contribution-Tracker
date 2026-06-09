import type pg from 'pg';
import type { DbUser, UpsertUserInput } from '../domain/user.js';

export class UserRepository {
  constructor(private db: pg.Pool) {}

  async findById(id: string): Promise<DbUser | null> {
    const result = await this.db.query<DbUser>(
      `SELECT id, github_id, username, display_name, avatar_url, bio, email, profile_url, created_at
       FROM users WHERE id = $1`,
      [id],
    );
    return result.rows[0] ?? null;
  }

  async upsert(input: UpsertUserInput): Promise<DbUser> {
    const result = await this.db.query<DbUser>(
      `INSERT INTO users (github_id, username, display_name, avatar_url, bio, email, profile_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (github_id) DO UPDATE SET
         username = EXCLUDED.username,
         display_name = EXCLUDED.display_name,
         avatar_url = EXCLUDED.avatar_url,
         bio = EXCLUDED.bio,
         email = EXCLUDED.email,
         profile_url = EXCLUDED.profile_url
       RETURNING id, github_id, username, display_name, avatar_url, bio, email, profile_url, created_at`,
      [
        input.githubId,
        input.username,
        input.displayName,
        input.avatarUrl,
        input.bio,
        input.email,
        input.profileUrl,
      ],
    );
    return result.rows[0]!;
  }
}
