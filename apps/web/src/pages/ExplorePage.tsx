import { useCallback, useEffect, useState } from 'react';
import type { ContributorProfile, WatchedContributor } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { ContributorDashboard } from '../components/ContributorDashboard';
import { EmptyState } from '../components/EmptyState';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  exploreUser,
  fetchWatchlist,
  refreshWatched,
  unwatchUser,
  watchUser,
} from '../lib/exploreApi';

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

export function ExplorePage() {
  const { user, login } = useAuth();
  const [query, setQuery] = useState('');
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [watchlist, setWatchlist] = useState<WatchedContributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(() => {
    if (!user) return;
    fetchWatchlist().then(setWatchlist).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  async function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);
    try {
      const data = await exploreUser(query);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }

  async function handleWatch() {
    if (!profile) return;
    try {
      await watchUser(profile.username);
      loadWatchlist();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to watch');
    }
  }

  async function handleSelect(username: string) {
    setQuery(username);
    setLoading(true);
    setError(null);
    try {
      const data = await exploreUser(username);
      setProfile(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lookup failed');
    } finally {
      setLoading(false);
    }
  }

  if (!user) {
    return (
      <LoggedOutLanding
        title="Explore open source contributors"
        description="Look up any public GitHub profile — repos, PRs, and activity charts aggregated in one view."
        onLogin={login}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Public profiles"
        title="Explore"
        description="Look up any GitHub username — public repos, PRs, and recent commits only."
      >
        <form onSubmit={handleLookup} className="mt-5 flex max-w-xl flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="github username"
            className="input min-w-[200px] flex-1 text-sm"
          />
          <button type="submit" disabled={loading} className="btn btn-primary">
            {loading ? 'Searching…' : 'Look up'}
          </button>
        </form>
        {error && <p className="alert alert-error mt-3 max-w-xl">{error}</p>}
      </PageHeader>

      <main className="page-main flex flex-col gap-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <Panel title="Watchlist" subtitle="Saved profiles">
            {watchlist.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No one watched yet.</p>
            ) : (
              <ul className="list-picker">
                {watchlist.map((w) => (
                  <li key={w.username}>
                    <button
                      type="button"
                      onClick={() => handleSelect(w.username)}
                      className="list-picker-item"
                    >
                      {w.avatarUrl ? (
                        <img src={w.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)] text-xs font-semibold">
                          {w.username[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate text-sm font-medium">@{w.username}</span>
                      <span className="text-[10px] font-medium text-[var(--color-muted)]">
                        {w.stats.pullRequests} pr
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>

        <div className="min-w-0 flex-1">
          {profile && (
            <>
              <div className="panel mb-6 flex flex-wrap items-center gap-4 px-4 py-4">
                {profile.avatarUrl && (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full ring-2 ring-[var(--color-accent)]/20"
                  />
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-medium">
                    {profile.displayName ?? profile.username}
                  </h3>
                  <a
                    href={profile.profileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-[var(--color-accent)] hover:underline"
                  >
                    @{profile.username}
                  </a>
                  <p className="mt-1 text-[10px] font-medium text-[var(--color-muted)]">
                    synced {new Date(profile.syncedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={handleWatch} className="btn btn-secondary text-sm">
                    Watch
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      refreshWatched(profile.username)
                        .then(setProfile)
                        .catch((err) =>
                          setError(err instanceof Error ? err.message : 'Refresh failed'),
                        )
                    }
                    className="btn btn-secondary text-sm"
                  >
                    Refresh
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      unwatchUser(profile.username)
                        .then(loadWatchlist)
                        .catch(() => {})
                    }
                    className="btn btn-ghost text-sm"
                  >
                    Unwatch
                  </button>
                </div>
              </div>

              <ContributorDashboard profile={profile} statIcons={icons} />
            </>
          )}

          {!profile && !loading && (
            <EmptyState
              icon="search"
              title="Search a GitHub username"
              description="See their public PR history, contributed repos, and activity charts — like viewing their GitHub profile, but aggregated."
            />
          )}
        </div>
      </main>
    </>
  );
}
