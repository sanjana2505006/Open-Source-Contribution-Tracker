import { useCallback, useEffect, useState } from 'react';
import type { ContributorProfile, WatchedContributor } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { ContributorDashboard } from '../components/ContributorDashboard';
import { EmptyState } from '../components/EmptyState';
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
      <main className="p-6">
        <EmptyState
          title="Sign in to explore contributors"
          description="Look up any public GitHub profile to see where they contribute."
          action={
            <button
              type="button"
              onClick={login}
              className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Sign in with GitHub
            </button>
          }
        />
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-[var(--color-border)] px-6 py-5">
        <h2 className="text-xl font-medium tracking-tight">Explore</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Look up any GitHub username — public repos, PRs, and recent commits only.
        </p>

        <form onSubmit={handleLookup} className="mt-4 flex flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="github username"
            className="min-w-[200px] flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-sm outline-none focus:border-[var(--color-accent-dim)]"
          />
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {loading ? 'Searching…' : 'Look up'}
          </button>
        </form>

        {error && (
          <p className="mt-3 text-sm text-[var(--color-bad)]">{error}</p>
        )}
      </header>

      <main className="flex flex-col gap-6 p-6 lg:flex-row">
        <aside className="lg:w-56 lg:shrink-0">
          <Panel title="Watchlist" subtitle="Saved profiles">
            {watchlist.length === 0 ? (
              <p className="text-sm text-[var(--color-muted)]">No one watched yet.</p>
            ) : (
              <ul className="space-y-1">
                {watchlist.map((w) => (
                  <li key={w.username}>
                    <button
                      type="button"
                      onClick={() => handleSelect(w.username)}
                      className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-[var(--color-panel-hover)]"
                    >
                      {w.avatarUrl ? (
                        <img src={w.avatarUrl} alt="" className="h-7 w-7 rounded-full" />
                      ) : (
                        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-surface)] font-mono text-xs">
                          {w.username[0]?.toUpperCase()}
                        </span>
                      )}
                      <span className="min-w-0 flex-1 truncate font-mono">@{w.username}</span>
                      <span className="font-mono text-[10px] text-[var(--color-muted)]">
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
              <div className="mb-6 flex flex-wrap items-center gap-4">
                {profile.avatarUrl && (
                  <img
                    src={profile.avatarUrl}
                    alt=""
                    className="h-14 w-14 rounded-full ring-2 ring-[var(--color-border)]"
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
                    className="font-mono text-sm text-[var(--color-accent)] hover:underline"
                  >
                    @{profile.username}
                  </a>
                  <p className="mt-1 font-mono text-[10px] text-[var(--color-muted)]">
                    synced {new Date(profile.syncedAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleWatch}
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-accent-dim)]"
                  >
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
                    className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm hover:border-[var(--color-accent-dim)]"
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
                    className="rounded-md px-3 py-1.5 text-sm text-[var(--color-muted)] hover:text-[var(--color-text)]"
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
              title="Search a GitHub username"
              description="See their public PR history, contributed repos, and activity charts — like viewing their GitHub profile, but aggregated."
            />
          )}
        </div>
      </main>
    </>
  );
}
