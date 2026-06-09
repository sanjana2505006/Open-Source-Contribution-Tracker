import { useCallback, useEffect, useState } from 'react';
import type { HealthResponse, RepositorySummary, StatsSummary } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { EmptyState } from '../components/EmptyState';
import { Panel } from '../components/Panel';
import { RepoList } from '../components/RepoList';
import { StatCard, StatCardSkeleton } from '../components/StatCard';
import { SyncControls } from '../components/SyncControls';
import { SystemStatus } from '../components/SystemStatus';
import { fetchHealth, fetchRepositories, fetchStats } from '../lib/api';

function StatIcons() {
  return {
    pr: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 3.25a2.25 2.25 0 113 0v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 00-1.5 0v8.5a2.25 2.25 0 105.5 0V7a.75.75 0 011.5 0v2.75a3.75 3.75 0 11-7.5 0v-6.5zM14.25 6a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm-2-2.5a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5z" />
      </svg>
    ),
    repo: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-7a1 1 0 00-1 1v1H4.5a.75.75 0 010-1.5H6V3.25a.5.5 0 01.5-.5h7v9h-7a2.5 2.5 0 01-2.5-2.5V2.5z" />
      </svg>
    ),
    commit: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
      </svg>
    ),
  };
}

const icons = StatIcons();

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

  const hasData =
    stats && (stats.repositories > 0 || stats.pullRequests > 0 || stats.commits > 0);

  return (
    <>
      <header className="border-b border-[var(--color-border)] px-6 py-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="animate-fade-up">
            {user ? (
              <>
                <p className="font-mono text-xs text-[var(--color-muted)]">Dashboard</p>
                <h2 className="mt-1 text-xl font-medium tracking-tight">
                  Hey,{' '}
                  <span className="text-[var(--color-accent)]">@{user.username}</span>
                </h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  {hasData
                    ? 'Your open-source activity at a glance.'
                    : 'Sync once to populate your stats and charts.'}
                </p>
              </>
            ) : (
              <>
                <h2 className="text-xl font-medium tracking-tight">Overview</h2>
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  Track your GitHub contributions in one place.
                </p>
              </>
            )}
          </div>

          <div className="flex flex-col items-end gap-3 animate-fade-up animate-fade-up-delay-1">
            <SystemStatus health={health} error={error} loading={loading} />
            {user && <SyncControls onComplete={() => loadData().catch(() => {})} />}
          </div>
        </div>
      </header>

      <main className="p-6">
        {oauthError && (
          <p className="mb-4 rounded-md border border-[var(--color-bad)]/30 bg-[var(--color-bad)]/10 px-4 py-3 text-sm text-[var(--color-bad)]">
            {oauthError}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-3">
          {loading || authLoading ? (
            <>
              <StatCardSkeleton />
              <StatCardSkeleton />
              <StatCardSkeleton />
            </>
          ) : (
            <>
              <StatCard
                label="Pull requests"
                value={stats?.pullRequests ?? '—'}
                accent="var(--color-pr)"
                icon={icons.pr}
                delay="animate-fade-up-delay-1"
              />
              <StatCard
                label="Repositories"
                value={stats?.repositories ?? '—'}
                accent="var(--color-repo)"
                icon={icons.repo}
                delay="animate-fade-up-delay-2"
              />
              <StatCard
                label="Commits"
                value={stats?.commits ?? '—'}
                accent="var(--color-commit)"
                icon={icons.commit}
                delay="animate-fade-up-delay-3"
              />
            </>
          )}
        </section>

        {!authLoading && !user && (
          <div className="mt-8">
            <EmptyState
              title="Connect your GitHub account"
              description="Sign in to import your repos, pull requests, and commit history."
              action={
                <button
                  type="button"
                  onClick={login}
                  className="inline-flex items-center gap-2 rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white hover:opacity-90"
                >
                  Sign in with GitHub
                </button>
              }
            />
          </div>
        )}

        {user && hasData && <AnalyticsPanel />}

        {user && repos.length > 0 && (
          <div className="mt-8 animate-fade-up">
            <Panel
              title="Repositories"
              subtitle={`${repos.length} synced · sorted by recent activity`}
            >
              <RepoList repos={repos.slice(0, 8)} />
            </Panel>
          </div>
        )}

        {user && stats && !hasData && (
          <div className="mt-8">
            <EmptyState
              title="Nothing synced yet"
              description="Hit Sync from GitHub in the header to pull your contribution data."
            />
          </div>
        )}
      </main>
    </>
  );
}
