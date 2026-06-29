import type { Request, Response } from 'express';
import { z } from 'zod';
import type pg from 'pg';
import type { PullRequestList, PullRequestStatusFilter } from '@osct/shared';
import type { Env } from '../config/env.js';
import { AppError } from '../middleware/errorHandler.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { PrAiDetectionService } from '../services/prAiDetectionService.js';

const STATUS_FILTERS = new Set<PullRequestStatusFilter>(['all', 'open', 'merged', 'closed']);

const aiCheckBodySchema = z.object({
  url: z.string().trim().min(1).optional(),
  owner: z.string().trim().min(1).optional(),
  repo: z.string().trim().min(1).optional(),
  number: z.coerce.number().int().positive().optional(),
});

function parseStatus(value: unknown): PullRequestStatusFilter {
  if (typeof value === 'string' && STATUS_FILTERS.has(value as PullRequestStatusFilter)) {
    return value as PullRequestStatusFilter;
  }
  return 'all';
}

function parseSort(
  value: unknown,
  status: PullRequestStatusFilter,
): 'newest' | 'oldest' {
  if (value === 'newest' || value === 'oldest') return value;
  return status === 'open' ? 'oldest' : 'newest';
}

export function createPullRequestRoutes(db: pg.Pool, env: Env) {
  const contributions = new ContributionRepository(db);
  const prAi = new PrAiDetectionService(env, db);

  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const repo =
        typeof req.query.repo === 'string' ? req.query.repo.trim() : undefined;
      const status = parseStatus(req.query.status);
      const sort = parseSort(req.query.sort, status);
      const limit =
        typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
      const offset =
        typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

      const [{ items, total }, counts] = await Promise.all([
        contributions.listPullRequests(req.user.id, {
          repo,
          status: status === 'all' ? undefined : status,
          sort,
          limit: Number.isFinite(limit) ? limit : 100,
          offset: Number.isFinite(offset) ? offset : 0,
        }),
        contributions.countPullRequestsByStatus(req.user.id, repo),
      ]);

      const data: PullRequestList = {
        repository: repo ?? null,
        status,
        counts,
        total,
        items: items.map((row) => ({
          id: row.id,
          title: row.title ?? 'Untitled PR',
          state: row.state as PullRequestList['items'][0]['state'],
          isMerged: row.is_merged ?? false,
          occurredAt: row.occurred_at.toISOString(),
          htmlUrl: row.html_url,
          repositoryFullName: row.full_name,
        })),
      };

      res.json({ data, meta: { total } });
    },

    async aiCheck(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const parsed = aiCheckBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR');
      }

      const data = await prAi.analyze(req.user.id, parsed.data);
      res.json({ data });
    },

    async aiCheckStatus(_req: Request, res: Response): Promise<void> {
      res.json({ data: { enabled: prAi.isEnabled() } });
    },
  };
}
