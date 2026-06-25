import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getPool } from './pool.js';
import type { Env } from '../../config/env.js';

const migrationsDir = path.resolve(
  fileURLToPath(new URL('../../../../../database/migrations', import.meta.url)),
);

export async function runMigrations(env: Env): Promise<void> {
  const db = getPool(env);

  await db.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = await db.query<{ filename: string }>(
    'SELECT filename FROM schema_migrations ORDER BY filename',
  );
  const appliedSet = new Set(applied.rows.map((row) => row.filename));

  let files: string[];
  try {
    files = (await readdir(migrationsDir))
      .filter((f) => f.endsWith('.sql'))
      .sort();
  } catch (err) {
    console.warn(`Migrations directory not found (${migrationsDir}), skipping.`, err);
    return;
  }

  for (const file of files) {
    if (appliedSet.has(file)) continue;

    const sql = await readFile(path.join(migrationsDir, file), 'utf8');
    const client = await db.connect();

    try {
      await client.query('BEGIN');
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      await client.query('COMMIT');
      console.log(`Applied ${file}`);
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
