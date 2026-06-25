import type { Request, Response } from 'express';
import type { HealthResponse } from '@osct/shared';
import { checkDbConnection, getPool } from '../infrastructure/db/pool.js';
import type { Env } from '../config/env.js';

async function digestMigrationReady(env: Env): Promise<boolean> {
  try {
    const pool = getPool(env);
    const result = await pool.query<{ ready: boolean }>(
      `SELECT EXISTS (
         SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = 'digest_preferences'
       ) AS ready`,
    );
    return result.rows[0]?.ready === true;
  } catch {
    return false;
  }
}

export function createHealthHandler(env: Env) {
  return async (_req: Request, res: Response): Promise<void> => {
    const dbUp = await checkDbConnection(env);
    const digestReady = dbUp ? await digestMigrationReady(env) : false;
    const digestEmail =
      env.RESEND_API_KEY && env.DIGEST_FROM_EMAIL ? 'configured' : 'disabled';

    const body: HealthResponse = {
      status: dbUp && digestReady ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      digest: digestReady ? 'ready' : 'pending',
      digestEmail,
      timestamp: new Date().toISOString(),
      version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    };

    res.status(dbUp ? 200 : 503).json({ data: body });
  };
}
