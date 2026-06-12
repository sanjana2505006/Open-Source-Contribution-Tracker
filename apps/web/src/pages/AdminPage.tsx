import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import type { AdminUserList, FeedbackList } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { fetchAdminFeedback, fetchAdminUsers } from '../lib/api';

function formatDuration(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatWhen(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString();
}

function categoryLabel(category: string): string {
  switch (category) {
    case 'bug':
      return 'Bug';
    case 'feature':
      return 'Feature';
    case 'praise':
      return 'Praise';
    default:
      return 'General';
  }
}

export function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const [data, setData] = useState<AdminUserList | null>(null);
  const [feedback, setFeedback] = useState<FeedbackList | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user?.isAdmin) return;

    setLoading(true);
    Promise.all([fetchAdminUsers(), fetchAdminFeedback()])
      .then(([users, feedbackData]) => {
        setData(users);
        setFeedback(feedbackData);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : 'Failed to load admin data');
      })
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) {
    return <main className="page-main"><div className="panel skeleton h-64" /></main>;
  }

  if (!user?.isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      <PageHeader
        eyebrow="Admin"
        title="Users"
        description="Who signed in, how often, and feedback people send from the site."
      />

      <main className="page-main space-y-4">
        {error && <p className="alert alert-error">{error}</p>}

        {data && (
          <section className="grid gap-4 sm:grid-cols-3">
            <Panel title="Total users" subtitle="Signed up via GitHub">
              <p className="px-4 pb-4 text-3xl font-semibold tabular-nums">{data.totals.users}</p>
            </Panel>
            <Panel title="Active now" subtitle="Seen in last 5 minutes">
              <p className="px-4 pb-4 text-3xl font-semibold tabular-nums text-[var(--color-ok)]">
                {data.totals.activeNow}
              </p>
            </Panel>
            <Panel title="Total logins" subtitle="Login events across all users (see Logins column)">
              <p className="px-4 pb-4 text-3xl font-semibold tabular-nums">{data.totals.logins}</p>
            </Panel>
          </section>
        )}

        <Panel flush title={`All users (${data?.totals.users ?? 0})`} subtitle="One row per user — Logins is how many times they signed in">
          {loading && <div className="px-4 py-8 text-sm text-[var(--color-muted)]">Loading…</div>}

          {!loading && data && data.users.length === 0 && (
            <p className="px-4 py-8 text-sm text-[var(--color-muted)]">No users yet.</p>
          )}

          {!loading && data && data.users.length > 0 && (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Signed up</th>
                    <th>Logins</th>
                    <th>Last login</th>
                    <th>Last seen</th>
                    <th>Time on site</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <div className="admin-table__user">
                          {row.avatarUrl ? (
                            <img src={row.avatarUrl} alt="" className="admin-table__avatar" />
                          ) : (
                            <span className="admin-table__avatar admin-table__avatar--fallback">
                              {row.username[0]?.toUpperCase()}
                            </span>
                          )}
                          <span>
                            <span className="admin-table__name">
                              {row.displayName ?? row.username}
                            </span>
                            <a
                              href={`https://github.com/${row.username}`}
                              target="_blank"
                              rel="noreferrer"
                              className="admin-table__handle"
                            >
                              @{row.username}
                            </a>
                          </span>
                        </div>
                      </td>
                      <td>{row.email ?? '—'}</td>
                      <td>{formatWhen(row.signedUpAt)}</td>
                      <td className="tabular-nums">{row.loginCount}</td>
                      <td>{formatWhen(row.lastLoginAt)}</td>
                      <td>{formatWhen(row.lastSeenAt)}</td>
                      <td className="tabular-nums">{formatDuration(row.totalTimeSeconds)}</td>
                      <td>
                        {row.activeNow ? (
                          <span className="admin-table__badge admin-table__badge--live">Active</span>
                        ) : (
                          <span className="admin-table__badge">Offline</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        <Panel flush title={`Feedback (${feedback?.total ?? 0})`} subtitle="From /feedback — newest first">
          {loading && <div className="px-4 py-8 text-sm text-[var(--color-muted)]">Loading…</div>}

          {!loading && feedback && feedback.items.length === 0 && (
            <p className="px-4 py-8 text-sm text-[var(--color-muted)]">No feedback yet.</p>
          )}

          {!loading && feedback && feedback.items.length > 0 && (
            <div className="admin-feedback-list">
              {feedback.items.map((item) => (
                <article key={item.id} className="admin-feedback-item">
                  <div className="admin-feedback-item__meta">
                    <span className="badge badge-open">{categoryLabel(item.category)}</span>
                    {item.rating != null && (
                      <span className="text-xs text-[var(--color-warn)]">
                        {'★'.repeat(item.rating)}
                        {'☆'.repeat(5 - item.rating)}
                      </span>
                    )}
                    <time dateTime={item.createdAt} className="text-xs text-[var(--color-muted)]">
                      {formatWhen(item.createdAt)}
                    </time>
                  </div>
                  <p className="admin-feedback-item__message">{item.message}</p>
                  <p className="admin-feedback-item__footer">
                    {item.username ? `@${item.username}` : 'Anonymous'}
                    {item.email ? ` · ${item.email}` : ''}
                    {item.pageUrl ? ` · from ${item.pageUrl}` : ''}
                  </p>
                </article>
              ))}
            </div>
          )}
        </Panel>

        <p className="text-xs text-[var(--color-muted)]">
          Time on site is estimated from login to last activity (updated every minute while browsing).
          Add a privacy policy before using this commercially.
        </p>
      </main>
    </>
  );
}
