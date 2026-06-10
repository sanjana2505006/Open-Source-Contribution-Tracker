import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { PullRequestItem, RepositorySummary } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { EmptyState } from '../components/EmptyState';
import { Panel } from '../components/Panel';
import { PullRequestTable } from '../components/PullRequestTable';
import { fetchPullRequests, fetchRepositories } from '../lib/api';

export function RepositoriesPage() {
  const { user, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRepo = searchParams.get('repo') ?? '';

  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingPrs, setLoadingPrs] = useState(false);

  useEffect(() => {
    if (!user) return;
    setLoadingRepos(true);
    fetchRepositories(500)
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoadingRepos(false));
  }, [user]);

  const loadPrs = useCallback(
    (repo: string) => {
      if (!repo) {
        setPullRequests([]);
        setTotal(0);
        return;
      }
      setLoadingPrs(true);
      fetchPullRequests(repo)
        .then((data) => {
          setPullRequests(data.items);
          setTotal(data.total);
        })
        .catch(() => {
          setPullRequests([]);
          setTotal(0);
        })
        .finally(() => setLoadingPrs(false));
    },
    [],
  );

  useEffect(() => {
    loadPrs(selectedRepo);
  }, [selectedRepo, loadPrs]);

  const filteredRepos = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, filter]);

  function selectRepo(fullName: string) {
    setSearchParams({ repo: fullName });
  }

  if (!user) {
    return (
      <main className="p-6">
        <EmptyState
          title="Sign in to browse your PRs"
          description="Find every pull request you've opened, grouped by repository."
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
        <h2 className="text-xl font-medium tracking-tight">My pull requests</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Pick a repo to see every PR you've raised there.
        </p>
      </header>

      <main className="flex flex-col gap-4 p-6 lg:flex-row lg:items-start">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <Panel title="Repositories" subtitle={`${repos.length} synced`}>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter repos…"
              className="mb-3 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 font-mono text-xs outline-none focus:border-[var(--color-accent-dim)]"
            />
            {loadingRepos ? (
              <div className="skeleton h-40 rounded-md" />
            ) : (
              <ul className="max-h-[420px] space-y-0.5 overflow-y-auto">
                {filteredRepos.map((repo) => (
                  <li key={repo.id}>
                    <button
                      type="button"
                      onClick={() => selectRepo(repo.fullName)}
                      className={[
                        'flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors',
                        selectedRepo === repo.fullName
                          ? 'bg-[var(--color-accent)]/15 text-[var(--color-text)]'
                          : 'hover:bg-[var(--color-panel-hover)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
                      ].join(' ')}
                    >
                      <span className="truncate font-mono text-xs">{repo.fullName}</span>
                    </button>
                  </li>
                ))}
                {filteredRepos.length === 0 && (
                  <p className="py-4 text-center text-xs text-[var(--color-muted)]">
                    No repos match.
                  </p>
                )}
              </ul>
            )}
          </Panel>
        </aside>

        <div className="min-w-0 flex-1">
          {selectedRepo ? (
            <Panel
              title={selectedRepo}
              subtitle={`${total} pull request${total === 1 ? '' : 's'}`}
            >
              <PullRequestTable pullRequests={pullRequests} loading={loadingPrs} />
            </Panel>
          ) : (
            <EmptyState
              title="Select a repository"
              description="Choose a repo from the list — or open Overview and click a repo to jump here."
            />
          )}
        </div>
      </main>
    </>
  );
}
