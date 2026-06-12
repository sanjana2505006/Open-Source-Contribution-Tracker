import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { WatchedContributor } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { EmptyState } from '../components/EmptyState';
import { LandingFeatures } from '../components/LandingFeatures';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { fetchWatchlist } from '../lib/exploreApi';
import { portfolioPath } from '../lib/portfolio';

export function ExplorePage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [watchlist, setWatchlist] = useState<WatchedContributor[]>([]);
  const [error, setError] = useState<string | null>(null);

  const loadWatchlist = useCallback(() => {
    if (!user) return;
    fetchWatchlist().then(setWatchlist).catch(() => {});
  }, [user]);

  useEffect(() => {
    loadWatchlist();
  }, [loadWatchlist]);

  function handleLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;

    setError(null);
    navigate(portfolioPath(query.trim()));
  }

  function handleSelect(username: string) {
    navigate(portfolioPath(username));
  }

  return (
    <>
      <PageHeader
        eyebrow={user ? 'Public profiles' : 'Explore'}
        title="Find contributor portfolios"
        description={
          user
            ? 'Look up any GitHub username — each profile gets a shareable public link.'
            : 'Search any GitHub username — no sign-in required to view public portfolios.'
        }
      >
        <form onSubmit={handleLookup} className="mt-5 flex max-w-xl flex-wrap gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="github username"
            className="input min-w-[200px] flex-1 text-sm"
          />
          <button type="submit" className="btn btn-primary">
            View portfolio
          </button>
        </form>
        {error && <p className="alert alert-error mt-3 max-w-xl">{error}</p>}
        {!user && (
          <button type="button" onClick={login} className="btn btn-secondary mt-3 text-sm">
            Sign in to save a watchlist
          </button>
        )}
      </PageHeader>

      <main className="page-main flex flex-col gap-6 lg:flex-row">
        {user && (
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
        )}

        <div className="min-w-0 flex-1">
          <EmptyState
            icon="search"
            title="Search a GitHub username"
            description="Every profile gets a shareable link like /u/octocat — stats, charts, and repos from public GitHub activity."
          />

          {!user && (
            <div className="mt-8">
              <LandingFeatures onLogin={login} compact />
            </div>
          )}
        </div>
      </main>
    </>
  );
}
