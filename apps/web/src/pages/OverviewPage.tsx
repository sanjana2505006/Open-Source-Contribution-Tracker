import { useCallback, useEffect, useState } from 'react';
import type { HealthResponse, RepositorySummary, StatsSummary } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { SyncControls } from '../components/SyncControls';
import { SystemStatus } from '../components/SystemStatus';
import { fetchHealth, fetchRepositories, fetchStats } from '../lib/api';

export function OverviewPage() {
  const { user, loading: authLoading, login } = useAuth();
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [stats, setStats] = useState<StatsSummary | null>(null);
  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    const healthData = await fetchHealth();
    setHealth(healthData);

    if (user) {
      const [statsData, repoData] = await Promise.all([
        fetchStats(),
        fetchRepositories(),
      ]);
      setStats(statsData);
      setRepos(repoData);
    } else {
      setStats(null);
      setRepos([]);
    }
  }, [user]);

  useEffect(() => {
    let cancelled = false;

    loadData()
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'request failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [loadData]);

  const oauthError =
    new URLSearchParams(window.location.search).get('error') === 'oauth_failed'
      ? 'GitHub sign-in failed. Try again.'
      : new URLSearchParams(window.location.search).get('error') === 'oauth_state'
        ? 'Sign-in session expired. Try again.'
        : null;

  return (
    <>
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-base font-medium">Overview</h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {user
              ? 'Pull your public repos and PR history from GitHub.'
              : 'Sign in to sync your contribution data.'}
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <SystemStatus health={health} error={error} loading={loading} />
          {user && <SyncControls onComplete={() => loadData().catch(() => {})} />}
        </div>
      </header>

      <main className="p-6">
        {oauthError && (
          <p className="mb-4 rounded border border-[var(--color-bad)]/40 bg-[var(--color-bad)]/10 px-4 py-3 text-sm text-[var(--color-bad)]">
            {oauthError}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Pull requests', value: stats?.pullRequests ?? '—' },
            { label: 'Repositories', value: stats?.repositories ?? '—' },
            { label: 'Commits', value: stats?.commits ?? '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-5"
            >
              <p className="text-xs text-[var(--color-muted)]">{stat.label}</p>
              <p className="mt-2 font-mono text-2xl tabular-nums">{stat.value}</p>
            </div>
          ))}
        </section>

        {!authLoading && !user && (
          <section className="mt-6 rounded border border-dashed border-[var(--color-border)] px-5 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">No account linked.</p>
            <button
              type="button"
              onClick={login}
              className="mt-4 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-sm hover:border-[var(--color-accent-dim)]"
            >
              Sign in with GitHub
            </button>
          </section>
        )}

        {user && stats && (stats.repositories > 0 || stats.pullRequests > 0 || stats.commits > 0) && (
          <AnalyticsPanel />
        )}

        {user && repos.length > 0 && (
          <section className="mt-6">
            <h3 className="mb-3 text-sm font-medium">Recent repositories</h3>
            <ul className="divide-y divide-[var(--color-border)] rounded border border-[var(--color-border)] bg-[var(--color-panel)]">
              {repos.slice(0, 8).map((repo) => (
                <li key={repo.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <a
                      href={repo.htmlUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-sm hover:text-[var(--color-accent)]"
                    >
                      {repo.fullName}
                    </a>
                    {repo.primaryLanguage && (
                      <p className="mt-0.5 text-xs text-[var(--color-muted)]">
                        {repo.primaryLanguage}
                      </p>
                    )}
                  </div>
                  <span className="font-mono text-xs text-[var(--color-muted)]">
                    {repo.contributionCount} items
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {user && stats && stats.repositories === 0 && (
          <section className="mt-6 rounded border border-dashed border-[var(--color-border)] px-5 py-8 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No synced data yet. Hit sync to pull from GitHub.
            </p>
          </section>
        )}
      </main>
    </>
  );
}
