import type { IssueItem, IssueRole, PortfolioInsights } from '@osct/shared';
import type pg from 'pg';
import { stuckDaysSince, stuckReason } from '../lib/stuckIssues.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

function parseRoles(raw: { roles?: string[] } | null): IssueRole[] {
  const roles = raw?.roles ?? [];
  return roles.filter(
    (role): role is IssueRole =>
      role === 'assigned' || role === 'authored' || role === 'commented',
  );
}

export class PortfolioInsightsService {
  private users: UserRepository;
  private contributions: ContributionRepository;

  constructor(db: pg.Pool) {
    this.users = new UserRepository(db);
    this.contributions = new ContributionRepository(db);
  }

  async getInsights(username: string): Promise<PortfolioInsights | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    const counts = await this.contributions.countIssues(user.id);
    if (counts.all === 0) return null;

    const { items, total } = await this.contributions.listIssues(user.id, {
      role: 'stuck',
      limit: 8,
      sort: 'stuck',
    });

    const stuckIssues: IssueItem[] = items.map((row) => {
      const roles = parseRoles(row.raw_metadata);
      return {
        id: row.id,
        title: row.title ?? 'Untitled issue',
        state: row.state as IssueItem['state'],
        occurredAt: row.occurred_at.toISOString(),
        htmlUrl: row.html_url,
        repositoryFullName: row.full_name,
        roles,
        stuckDays: stuckDaysSince(row.raw_metadata, row.occurred_at),
        stuckReason: stuckReason(roles),
      };
    });

    return {
      osctMember: true,
      stuckIssueCount: total,
      stuckIssues,
    };
  }
}
