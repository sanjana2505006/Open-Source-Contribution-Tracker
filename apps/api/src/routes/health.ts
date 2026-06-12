import type { Request, Response } from 'express';
import type { HealthResponse } from '@osct/shared';
import { checkDbConnection } from '../infrastructure/db/pool.js';
import type { Env } from '../config/env.js';

export function createHealthHandler(env: Env) {
  return async (_req: Request, res: Response): Promise<void> => {
    const dbUp = await checkDbConnection(env);

    const body: HealthResponse = {
      status: dbUp ? 'ok' : 'degraded',
      db: dbUp ? 'up' : 'down',
      timestamp: new Date().toISOString(),
      version: process.env.RENDER_GIT_COMMIT?.slice(0, 7) ?? null,
    };

    res.status(dbUp ? 200 : 503).json({ data: body });
  };
}
