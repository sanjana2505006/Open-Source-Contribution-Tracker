import type { AdminUserList, AdminUserRow } from '@osct/shared';
import type pg from 'pg';

export class UserActivityRepository {
  constructor(private db: pg.Pool) {}

  async listUsersForAdmin(): Promise<AdminUserList> {
    const result = await this.db.query<{
      id: string;
      username: string;
      display_name: string | null;
      email: string | null;
      avatar_url: string | null;
      signed_up_at: Date;
      login_count: string;
      last_login_at: Date | null;
      last_seen_at: Date | null;
      total_seconds: string;
      active_now: boolean;
    }>(
      `SELECT
         u.id,
         u.username,
         u.display_name,
         u.email,
         u.avatar_url,
         u.created_at AS signed_up_at,
         COUNT(s.id)::text AS login_count,
         MAX(s.created_at) AS last_login_at,
         MAX(s.last_seen_at) AS last_seen_at,
         COALESCE(SUM(
           CASE
             WHEN s.duration_seconds IS NOT NULL THEN s.duration_seconds
             WHEN s.ended_at IS NULL AND s.last_seen_at IS NOT NULL THEN
               GREATEST(0, EXTRACT(EPOCH FROM (s.last_seen_at - s.created_at))::integer)
             ELSE 0
           END
         ), 0)::text AS total_seconds,
         COALESCE(BOOL_OR(
           s.ended_at IS NULL
           AND s.expires_at > NOW()
           AND s.last_seen_at > NOW() - INTERVAL '5 minutes'
         ), false) AS active_now
       FROM users u
       LEFT JOIN sessions s ON s.user_id = u.id
       GROUP BY u.id, u.username, u.display_name, u.email, u.avatar_url, u.created_at
       ORDER BY MAX(s.last_seen_at) DESC NULLS LAST, u.created_at DESC`,
    );

    const users: AdminUserRow[] = result.rows.map((row) => ({
      id: row.id,
      username: row.username,
      displayName: row.display_name,
      email: row.email,
      avatarUrl: row.avatar_url,
      signedUpAt: row.signed_up_at.toISOString(),
      loginCount: Number(row.login_count),
      lastLoginAt: row.last_login_at?.toISOString() ?? null,
      lastSeenAt: row.last_seen_at?.toISOString() ?? null,
      totalTimeSeconds: Number(row.total_seconds),
      activeNow: row.active_now,
    }));

    return {
      users,
      totals: {
        users: users.length,
        activeNow: users.filter((u) => u.activeNow).length,
        logins: users.reduce((sum, u) => sum + u.loginCount, 0),
      },
    };
  }
}
