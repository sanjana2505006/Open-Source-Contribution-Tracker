import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { HealthResponse, RepositorySummary, StatsSummary } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AnalyticsPanel } from '../components/AnalyticsPanel';
import { EmptyState } from '../components/EmptyState';
import { DashboardHero } from '../components/hero/DashboardHero';
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
    issue: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
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
      <DashboardHero
        fullScreen
        solo={!user}
        title={user ? 'Welcome' : 'Track'}
        highlight={user ? `@${user.username}` : 'Everything'}
        description={
          user
            ? hasData
              ? 'Your open-source contributions — PRs, repos, and milestones in one dashboard.'
              : 'Sync from GitHub once to pull your full contribution history.'
            : 'Your open-source story — PRs, repos, and milestones in one beautiful dashboard.'
        }
        footnote={
          user
            ? 'Move your mouse — the OSS squad shifts with you ✨'
            : undefined
        }
        primaryAction={
          user ? (
            <SyncControls onComplete={() => loadData().catch(() => {})} />
          ) : (
            <button type="button" onClick={login} className="hero-cta hero-cta--primary">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.778-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sign in with GitHub
            </button>
          )
        }
        secondaryAction={
          user ? (
            <Link to="/repos" className="hero-cta hero-cta--secondary">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M1.5 3.25a2.25 2.25 0 113 0v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 00-1.5 0v8.5a2.25 2.25 0 105.5 0V7a.75.75 0 011.5 0v2.75a3.75 3.75 0 11-7.5 0v-6.5z" />
              </svg>
              My PRs
            </Link>
          ) : (
            <Link to="/explore" className="hero-cta hero-cta--secondary">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-2.122-2.122a4.5 4.5 0 105.659-5.659 4.5 4.5 0 00-5.66 5.66z" />
              </svg>
              Explore
            </Link>
          )
        }
        meta={user ? <SystemStatus health={health} error={error} loading={loading} /> : undefined}
      >
        {!user && (
          <ul className="hero-mirofish__features">
            <li>Cross-repo PR inbox</li>
            <li>Contribution journey timeline</li>
            <li>Analytics &amp; milestones</li>
          </ul>
        )}
      </DashboardHero>

      {user && (
      <main className="page-main">
        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {loading || authLoading ? (
            <>
              <StatCardSkeleton />
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
                label="Issues"
                value={stats?.issues ?? '—'}
                accent="var(--color-warn)"
                icon={icons.issue}
                delay="animate-fade-up-delay-2"
              />
              <StatCard
                label="Repositories"
                value={stats?.repositories ?? '—'}
                accent="var(--color-repo)"
                icon={icons.repo}
                delay="animate-fade-up-delay-3"
              />
              <StatCard
                label="Commits"
                value={stats?.commits ?? '—'}
                accent="var(--color-commit)"
                icon={icons.commit}
              />
            </>
          )}
        </section>

        {user && hasData && <AnalyticsPanel />}

        {user && repos.length > 0 && (
          <div className="mt-8 animate-fade-up">
            <Panel
              flush
              title="Repositories"
              subtitle={
                stats
                  ? `${stats.repositories} total · click a repo to see your PRs`
                  : 'Click a repo to see your PRs'
              }
            >
              <RepoList repos={repos} />
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
      )}

      {!user && oauthError && (
        <p className="landing-oauth-error">{oauthError}</p>
      )}
    </>
  );
}
