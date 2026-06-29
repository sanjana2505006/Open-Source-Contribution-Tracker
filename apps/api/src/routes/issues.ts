import type { Request, Response } from 'express';
import { z } from 'zod';
import type { IssueList, IssueRole, IssueRoleFilter, IssueStatusFilter } from '@osct/shared';
import type pg from 'pg';
import type { Env } from '../config/env.js';
import { stuckDaysSince, stuckReason } from '../lib/stuckIssues.js';
import { AppError } from '../middleware/errorHandler.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { IssueAiDetectionService } from '../services/issueAiDetectionService.js';

const aiCheckBodySchema = z.object({
  url: z.string().trim().min(1).optional(),
  owner: z.string().trim().min(1).optional(),
  repo: z.string().trim().min(1).optional(),
  number: z.coerce.number().int().positive().optional(),
});

function parseRole(value: unknown): IssueRoleFilter {
  if (
    value === 'assigned' ||
    value === 'commented' ||
    value === 'authored' ||
    value === 'stuck' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
}

function parseStatus(value: unknown): IssueStatusFilter {
  if (value === 'open' || value === 'closed' || value === 'all') {
    return value;
  }
  return 'all';
}

function parseRoles(raw: { roles?: string[] } | null): IssueRole[] {
  const roles = raw?.roles ?? [];
  return roles.filter(
    (role): role is IssueRole =>
      role === 'assigned' || role === 'authored' || role === 'commented',
  );
}

export function createIssueRoutes(db: pg.Pool, env: Env) {
  const contributions = new ContributionRepository(db);
  const issueAi = new IssueAiDetectionService(env, db);

  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const repo =
        typeof req.query.repo === 'string' ? req.query.repo.trim() : undefined;
      const role = parseRole(req.query.role);
      const status = parseStatus(req.query.status);
      const sort =
        role === 'stuck'
          ? 'stuck'
          : req.query.sort === 'oldest' || req.query.sort === 'newest'
            ? req.query.sort
            : 'newest';
      const limit =
        typeof req.query.limit === 'string' ? Number(req.query.limit) : 100;
      const offset =
        typeof req.query.offset === 'string' ? Number(req.query.offset) : 0;

      const [{ items, total }, counts] = await Promise.all([
        contributions.listIssues(req.user.id, {
          repo,
          role: role === 'all' ? undefined : role,
          status: role === 'stuck' ? undefined : status === 'all' ? undefined : status,
          sort,
          limit: Number.isFinite(limit) ? limit : 100,
          offset: Number.isFinite(offset) ? offset : 0,
        }),
        contributions.countIssues(req.user.id, repo),
      ]);

      const data: IssueList = {
        repository: repo ?? null,
        role,
        status,
        counts,
        total,
        items: items.map((row) => {
          const roles = parseRoles(row.raw_metadata);
          const item: IssueList['items'][0] = {
            id: row.id,
            title: row.title ?? 'Untitled issue',
            state: row.state as IssueList['items'][0]['state'],
            occurredAt: row.occurred_at.toISOString(),
            htmlUrl: row.html_url,
            repositoryFullName: row.full_name,
            roles,
          };

          if (role === 'stuck') {
            item.stuckDays = stuckDaysSince(row.raw_metadata, row.occurred_at);
            item.stuckReason = stuckReason(roles);
          }

          return item;
        }),
      };

      res.json({ data, meta: { total } });
    },

    async aiCheck(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const parsed = aiCheckBodySchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        throw new AppError(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'VALIDATION_ERROR');
      }

      const data = await issueAi.analyze(req.user.id, parsed.data);
      res.json({ data });
    },

    async aiCheckStatus(_req: Request, res: Response): Promise<void> {
      res.json({ data: { enabled: issueAi.isEnabled() } });
    },
  };
}
