import type pg from 'pg';
import type { GitHubRepo } from '../infrastructure/github/api.js';

export type DbRepository = {
  id: string;
  github_id: string;
  full_name: string;
};

export class RepositoryRepository {
  constructor(private db: pg.Pool) {}

  async upsert(repo: GitHubRepo): Promise<DbRepository> {
    const result = await this.db.query<DbRepository>(
      `INSERT INTO repositories (
         github_id, owner_login, name, full_name, description, primary_language,
         stargazers_count, is_fork, is_private, html_url, default_branch, last_pushed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
       ON CONFLICT (github_id) DO UPDATE SET
         description = EXCLUDED.description,
         primary_language = EXCLUDED.primary_language,
         stargazers_count = EXCLUDED.stargazers_count,
         is_fork = EXCLUDED.is_fork,
         is_private = EXCLUDED.is_private,
         html_url = EXCLUDED.html_url,
         default_branch = EXCLUDED.default_branch,
         last_pushed_at = EXCLUDED.last_pushed_at
       RETURNING id, github_id, full_name`,
      [
        repo.id,
        repo.owner.login,
        repo.name,
        repo.full_name,
        repo.description,
        repo.language,
        repo.stargazers_count,
        repo.fork,
        repo.private,
        repo.html_url,
        repo.default_branch,
        repo.pushed_at ? new Date(repo.pushed_at) : null,
      ],
    );
    return result.rows[0]!;
  }

  async findByGithubId(githubId: number): Promise<DbRepository | null> {
    const result = await this.db.query<DbRepository>(
      `SELECT id, github_id, full_name FROM repositories WHERE github_id = $1`,
      [githubId],
    );
    return result.rows[0] ?? null;
  }

  async findByFullName(fullName: string): Promise<DbRepository | null> {
    const result = await this.db.query<DbRepository>(
      `SELECT id, github_id, full_name FROM repositories WHERE full_name = $1`,
      [fullName],
    );
    return result.rows[0] ?? null;
  }
}
