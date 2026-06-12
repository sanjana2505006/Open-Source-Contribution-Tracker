import type { ContributionHeatmap, ContributionStreak, HeatmapDay } from '@osct/shared';
import type { Env } from '../config/env.js';
import { computeContributionStreak, flattenHeatmapDays } from '../lib/contributionStreak.js';
import { GitHubGraphQL } from '../infrastructure/github/graphql.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

export class HeatmapService {
  private oauth: OAuthRepository;
  private users: UserRepository;

  constructor(
    private env: Env,
    db: import('pg').Pool,
  ) {
    this.oauth = new OAuthRepository(db);
    this.users = new UserRepository(db);
  }

  async getHeatmap(userId: string, yearParam?: number): Promise<ContributionHeatmap> {
    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new Error('No GitHub token on file');
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const gql = new GitHubGraphQL(token);
    const years = await gql.getContributionYears(user.username);
    const year = yearParam && years.includes(yearParam) ? yearParam : years[0] ?? new Date().getFullYear();
    const calendar = await gql.getContributionCalendar(user.username, year);

    return {
      year,
      totalContributions: calendar.totalContributions,
      weeks: calendar.weeks,
      years: years.length > 0 ? years : [year],
    };
  }

  async getStreak(userId: string): Promise<ContributionStreak> {
    const token = await this.oauth.getAccessToken(userId, this.env.SESSION_SECRET);
    if (!token) {
      throw new Error('No GitHub token on file');
    }

    const user = await this.users.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const gql = new GitHubGraphQL(token);
    const years = await gql.getContributionYears(user.username);
    const yearsToScan = years.slice(-6);

    const calendars = await Promise.all(
      yearsToScan.map((year) => gql.getContributionCalendar(user.username, year)),
    );

    const days = flattenHeatmapDays(calendars.flatMap((calendar) => calendar.weeks));
    const byDate = new Map<string, HeatmapDay>();
    for (const day of days) {
      const existing = byDate.get(day.date);
      if (!existing || day.count > existing.count) {
        byDate.set(day.date, day);
      }
    }

    return computeContributionStreak([...byDate.values()]);
  }
}
