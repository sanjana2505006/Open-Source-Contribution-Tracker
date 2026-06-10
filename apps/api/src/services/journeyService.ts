import type { JourneyBundle, MilestoneItem, MilestoneType } from '@osct/shared';
import type pg from 'pg';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { MilestoneRepository } from '../repositories/milestoneRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

type ContributionSnapshot = {
  id: string;
  title: string | null;
  type: string;
  occurred_at: Date;
  html_url: string;
  repository_id: string;
  full_name: string;
};

const MILESTONE_COPY: Record<
  Exclude<MilestoneType, 'custom'>,
  { title: string; description: (ctx: { repo?: string; detail?: string }) => string }
> = {
  account_linked: {
    title: 'Account connected',
    description: () => 'You linked your GitHub account to OSCT.',
  },
  first_contribution: {
    title: 'First contribution',
    description: ({ repo, detail }) =>
      repo ? `Your earliest synced activity in ${repo}.${detail ? ` ${detail}` : ''}` : 'Your earliest synced open-source activity.',
  },
  first_pull_request: {
    title: 'First pull request',
    description: ({ repo, detail }) =>
      repo ? `Opened your first PR in ${repo}.${detail ? ` "${detail}"` : ''}` : 'Opened your first pull request.',
  },
  first_merged_pr: {
    title: 'First merged PR',
    description: ({ repo, detail }) =>
      repo ? `Your first merge landed in ${repo}.${detail ? ` "${detail}"` : ''}` : 'Your first pull request was merged.',
  },
  tenth_pr: {
    title: '10th pull request',
    description: ({ repo, detail }) =>
      repo ? `Double digits — PR #10 in ${repo}.${detail ? ` "${detail}"` : ''}` : 'You opened your 10th pull request.',
  },
  hundredth_contribution: {
    title: '100th contribution',
    description: ({ repo, detail }) =>
      repo ? `A century of activity — #100 in ${repo}.${detail ? ` ${detail}` : ''}` : 'You reached 100 synced contributions.',
  },
};

export class JourneyService {
  private milestones: MilestoneRepository;
  private contributions: ContributionRepository;
  private users: UserRepository;

  constructor(db: pg.Pool) {
    this.milestones = new MilestoneRepository(db);
    this.contributions = new ContributionRepository(db);
    this.users = new UserRepository(db);
  }

  async refreshMilestones(userId: string): Promise<void> {
    const user = await this.users.findById(userId);
    if (!user) return;

    await this.milestones.upsert({
      userId,
      type: 'account_linked',
      title: MILESTONE_COPY.account_linked.title,
      description: MILESTONE_COPY.account_linked.description({}),
      occurredAt: user.created_at,
      metadata: { profileUrl: user.profile_url },
    });

    const firstContribution = await this.contributions.findAtPosition(userId, 1);
    if (firstContribution) {
      await this.upsertFromContribution(userId, 'first_contribution', firstContribution);
    }

    const firstPr = await this.contributions.findAtPosition(userId, 1, { type: 'pull_request' });
    if (firstPr) {
      await this.upsertFromContribution(userId, 'first_pull_request', firstPr);
    }

    const firstMerged = await this.contributions.findAtPosition(userId, 1, {
      type: 'pull_request',
      mergedOnly: true,
    });
    if (firstMerged) {
      await this.upsertFromContribution(userId, 'first_merged_pr', firstMerged);
    }

    const tenthPr = await this.contributions.findAtPosition(userId, 10, { type: 'pull_request' });
    if (tenthPr) {
      await this.upsertFromContribution(userId, 'tenth_pr', tenthPr);
    }

    const hundredth = await this.contributions.findAtPosition(userId, 100);
    if (hundredth) {
      await this.upsertFromContribution(userId, 'hundredth_contribution', hundredth);
    }
  }

  async getJourney(userId: string): Promise<JourneyBundle> {
    await this.refreshMilestones(userId);
    const rows = await this.milestones.listByUser(userId);
    const milestones = rows.map((row) => this.toItem(row));

    return {
      milestones,
      highlights: {
        firstPullRequest: milestones.find((m) => m.type === 'first_pull_request') ?? null,
        firstMergedPr: milestones.find((m) => m.type === 'first_merged_pr') ?? null,
      },
    };
  }

  private async upsertFromContribution(
    userId: string,
    type: Exclude<MilestoneType, 'account_linked' | 'custom'>,
    contribution: ContributionSnapshot,
  ): Promise<void> {
    const copy = MILESTONE_COPY[type];
    const detail = contribution.title?.trim() || undefined;

    await this.milestones.upsert({
      userId,
      type,
      title: copy.title,
      description: copy.description({
        repo: contribution.full_name,
        detail,
      }),
      occurredAt: contribution.occurred_at,
      contributionId: contribution.id,
      repositoryId: contribution.repository_id,
      metadata: {
        contributionType: contribution.type,
        contributionTitle: contribution.title,
      },
    });
  }

  private toItem(row: {
    id: string;
    type: MilestoneType;
    title: string;
    description: string | null;
    occurred_at: Date;
    html_url: string | null;
    full_name: string | null;
  }): MilestoneItem {
    return {
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      occurredAt: row.occurred_at.toISOString(),
      htmlUrl: row.html_url,
      repositoryFullName: row.full_name,
    };
  }
}
