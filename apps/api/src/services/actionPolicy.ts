import type { AgentActionPayload } from '@osct/shared';
import { AppError } from '../middleware/errorHandler.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';

const MAX_COMMENT_CHARS = 65_536;

function parseIssueNumber(htmlUrl: string): number | null {
  const match = htmlUrl.match(/\/issues\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

export class ActionPolicy {
  constructor(private contributions: ContributionRepository) {}

  assertCommentPayload(payload: AgentActionPayload): void {
    if (!payload.owner.trim() || !payload.repo.trim()) {
      throw new AppError(400, 'Issue owner and repo are required', 'VALIDATION_ERROR');
    }
    if (!Number.isInteger(payload.number) || payload.number < 1) {
      throw new AppError(400, 'Issue number must be a positive integer', 'VALIDATION_ERROR');
    }
    if (!payload.body.trim()) {
      throw new AppError(400, 'Comment body cannot be empty', 'VALIDATION_ERROR');
    }
    if (payload.body.length > MAX_COMMENT_CHARS) {
      throw new AppError(400, 'Comment is too long for GitHub', 'VALIDATION_ERROR');
    }
  }

  async assertIssueInUserScope(userId: string, payload: AgentActionPayload): Promise<void> {
    const fullName = `${payload.owner}/${payload.repo}`.toLowerCase();
    const { items } = await this.contributions.listIssues(userId, {
      repo: fullName,
      limit: 200,
    });

    const inScope = items.some((row) => parseIssueNumber(row.html_url) === payload.number);
    if (!inScope) {
      throw new AppError(
        403,
        'This issue is not in your synced OSCT inbox. Sync from GitHub first.',
        'FORBIDDEN',
      );
    }
  }
}
