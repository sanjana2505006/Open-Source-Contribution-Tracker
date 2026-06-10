import type { Request, Response } from 'express';
import type { IssueList, IssueRole, IssueRoleFilter, IssueStatusFilter } from '@osct/shared';
import type pg from 'pg';
import { AppError } from '../middleware/errorHandler.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';

function parseRole(value: unknown): IssueRoleFilter {
  if (value === 'assigned' || value === 'commented' || value === 'authored' || value === 'all') {
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

export function createIssueRoutes(db: pg.Pool) {
  const contributions = new ContributionRepository(db);

  return {
    async list(req: Request, res: Response): Promise<void> {
      if (!req.user) throw new AppError(401, 'Sign in required', 'UNAUTHORIZED');

      const repo =
        typeof req.query.repo === 'string' ? req.query.repo.trim() : undefined;
      const role = parseRole(req.query.role);
      const status = parseStatus(req.query.status);
      const sort =
        req.query.sort === 'oldest' || req.query.sort === 'newest'
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
          status: status === 'all' ? undefined : status,
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
        items: items.map((row) => ({
          id: row.id,
          title: row.title ?? 'Untitled issue',
          state: row.state as IssueList['items'][0]['state'],
          occurredAt: row.occurred_at.toISOString(),
          htmlUrl: row.html_url,
          repositoryFullName: row.full_name,
          roles: parseRoles(row.raw_metadata),
        })),
      };

      res.json({ data, meta: { total } });
    },
  };
}
