import type { FeedbackCategory, FeedbackItem } from '@osct/shared';
import type pg from 'pg';

type FeedbackRow = {
  id: string;
  username: string | null;
  email: string | null;
  category: FeedbackCategory;
  message: string;
  rating: number | null;
  page_url: string | null;
  created_at: Date;
};

export class FeedbackRepository {
  constructor(private db: pg.Pool) {}

  async create(input: {
    userId?: string | null;
    username?: string | null;
    email?: string | null;
    category: FeedbackCategory;
    message: string;
    rating?: number | null;
    pageUrl?: string | null;
  }): Promise<FeedbackItem> {
    const result = await this.db.query<FeedbackRow>(
      `INSERT INTO feedback (user_id, username, email, category, message, rating, page_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, username, email, category, message, rating, page_url, created_at`,
      [
        input.userId ?? null,
        input.username ?? null,
        input.email?.trim() || null,
        input.category,
        input.message.trim(),
        input.rating ?? null,
        input.pageUrl?.trim() || null,
      ],
    );

    return this.toItem(result.rows[0]!);
  }

  async list(limit = 50, offset = 0): Promise<{ items: FeedbackItem[]; total: number }> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const safeOffset = Math.max(offset, 0);

    const [rows, count] = await Promise.all([
      this.db.query<FeedbackRow>(
        `SELECT id, username, email, category, message, rating, page_url, created_at
         FROM feedback
         ORDER BY created_at DESC
         LIMIT $1 OFFSET $2`,
        [safeLimit, safeOffset],
      ),
      this.db.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM feedback`),
    ]);

    return {
      items: rows.rows.map((row) => this.toItem(row)),
      total: Number(count.rows[0]?.count ?? 0),
    };
  }

  private toItem(row: FeedbackRow): FeedbackItem {
    return {
      id: row.id,
      username: row.username,
      email: row.email,
      category: row.category,
      message: row.message,
      rating: row.rating,
      pageUrl: row.page_url,
      createdAt: row.created_at.toISOString(),
    };
  }
}
