import type { PublicPortfolioHighlights } from '@osct/shared';
import type { Env } from '../config/env.js';
import type pg from 'pg';
import { UserRepository } from '../repositories/userRepository.js';
import { HeatmapService } from './heatmapService.js';

export class PortfolioHighlightsService {
  private users: UserRepository;
  private heatmap: HeatmapService;

  constructor(env: Env, db: pg.Pool) {
    this.users = new UserRepository(db);
    this.heatmap = new HeatmapService(env, db);
  }

  async getHighlights(username: string): Promise<PublicPortfolioHighlights | null> {
    const user = await this.users.findByUsername(username);
    if (!user) return null;

    try {
      const streak = await this.heatmap.getStreak(user.id);
      return { osctMember: true, streak };
    } catch {
      return { osctMember: true, streak: null };
    }
  }
}
