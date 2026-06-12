import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { PublicProfile } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { ContributorDashboard } from '../components/ContributorDashboard';
import { PublicStuckIssuesPanel } from '../components/PublicStuckIssuesPanel';
import { SharePortfolioBar } from '../components/SharePortfolioBar';
import { PageHeader } from '../components/PageHeader';
import { usePageMeta } from '../hooks/usePageMeta';
import { exploreUser, watchUser } from '../lib/exploreApi';
import { fetchPublicProfile } from '../lib/portfolio';

function StatIcons() {
  return {
    pr: (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
        <path d="M1.5 3.25a2.25 2.25 0 113 0v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 00-1.5 0v8.5a2.25 2.25 0 105.5 0V7a.75.75 0 011.5 0v2.75a3.75 3.75 0 11-7.5 0v-6.5z" />
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

export function PortfolioPage() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  const { user, login } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const isOwner = Boolean(user && username && user.username.toLowerCase() === username.toLowerCase());

  usePageMeta({
    title: profile
      ? `${profile.displayName ?? profile.username} — Portfolio`
      : username
        ? `@${username} — Portfolio`
        : 'Portfolio',
    description: profile
      ? profile.insights?.stuckIssueCount
        ? `${profile.stats.pullRequests} pull requests · ${profile.insights.stuckIssueCount} stuck issues · public portfolio on OSCT`
        : `${profile.stats.pullRequests} pull requests · ${profile.stats.repositories} repositories · public open source activity on OSCT`
      : 'Public open source contribution portfolio on OSCT',
    image: profile?.avatarUrl,
  });

  const loadProfile = useCallback(async () => {
    if (!username) return;

    setLoading(true);
    setError(null);
    try {
      const data = await fetchPublicProfile(username);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Profile unavailable');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [username]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleRefresh() {
    if (!username || !user) return;

    setRefreshing(true);
    setError(null);
    try {
      const data = await exploreUser(username);
      setProfile({ ...data, source: 'live' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Refresh failed');
    } finally {
      setRefreshing(false);
    }
  }

  async function handleWatch() {
    if (!username) return;
    try {
      await watchUser(username);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to watch');
    }
  }

  if (!username) {
    navigate('/explore', { replace: true });
    return null;
  }

  return (
    <>
      <PageHeader
        eyebrow="Public portfolio"
        title={profile?.displayName ?? `@${username}`}
        description="Open source activity from public GitHub data — shareable with recruiters and collaborators."
      />

      <main className="page-main space-y-6">
        {loading && <div className="panel skeleton h-72" />}

        {!loading && error && (
          <div className="panel px-4 py-8 text-center">
            <p className="alert alert-error mx-auto max-w-lg">{error}</p>
            {!user ? (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <button type="button" onClick={login} className="btn btn-primary">
                  Sign in to publish
                </button>
                <Link to="/explore" className="btn btn-secondary">
                  Search another user
                </Link>
              </div>
            ) : (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {isOwner && (
                  <button type="button" onClick={handleRefresh} className="btn btn-primary">
                    Publish now
                  </button>
                )}
                <Link to="/explore" className="btn btn-secondary">
                  Back to Explore
                </Link>
              </div>
            )}
          </div>
        )}

        {!loading && profile && (
          <>
            <div className="panel flex flex-wrap items-center gap-4 px-4 py-4">
              {profile.avatarUrl && (
                <img
                  src={profile.avatarUrl}
                  alt=""
                  className="h-16 w-16 rounded-full ring-2 ring-[var(--color-accent)]/25"
                />
              )}
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">
                  {profile.displayName ?? profile.username}
                </h2>
                <a
                  href={profile.profileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  @{profile.username} on GitHub
                </a>
                <p className="mt-1 text-[10px] font-medium text-[var(--color-muted)]">
                  Updated {new Date(profile.syncedAt).toLocaleString()}
                  {profile.source === 'cache' ? ' · cached' : ' · live'}
                  {profile.insights && profile.insights.stuckIssueCount > 0 && (
                    <> · {profile.insights.stuckIssueCount} stuck issues</>
                  )}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                {user && !isOwner && (
                  <button type="button" onClick={handleWatch} className="btn btn-secondary text-sm">
                    Watch
                  </button>
                )}
                {user && isOwner && (
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="btn btn-secondary text-sm"
                  >
                    {refreshing ? 'Refreshing…' : 'Refresh portfolio'}
                  </button>
                )}
                {!user && (
                  <button type="button" onClick={login} className="btn btn-primary text-sm">
                    Sign in for full dashboard
                  </button>
                )}
              </div>
            </div>

            <SharePortfolioBar profile={profile} isOwner={isOwner} />

            {!user && !profile.insights && (
              <p className="rounded-lg border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm text-[var(--color-muted)]">
                Viewing public GitHub activity only.{' '}
                <button type="button" onClick={login} className="font-medium text-[var(--color-accent)] hover:underline">
                  Sign in
                </button>{' '}
                to track your own issues, journey, and stuck-issue inbox.
              </p>
            )}

            {profile.insights && (
              <PublicStuckIssuesPanel insights={profile.insights} isOwner={isOwner} />
            )}

            <ContributorDashboard profile={profile} statIcons={icons} />
          </>
        )}
      </main>
    </>
  );
}
