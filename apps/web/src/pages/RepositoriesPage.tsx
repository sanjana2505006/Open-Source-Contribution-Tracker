import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import type { PullRequestCounts, PullRequestItem, PullRequestStatusFilter, RepositorySummary } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AgentPanel } from '../components/agent/AgentPanel';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { PullRequestStatusTabs } from '../components/PullRequestStatusTabs';
import { PullRequestTable } from '../components/PullRequestTable';
import { fetchPullRequests, fetchRepositories } from '../lib/api';
import { repoPath } from '../lib/repoPath';

const DEFAULT_COUNTS: PullRequestCounts = { all: 0, open: 0, merged: 0, closed: 0 };

function parseStatus(
  value: string | null,
  inboxMode: boolean,
): PullRequestStatusFilter {
  if (value === 'open' || value === 'merged' || value === 'closed' || value === 'all') {
    return value;
  }
  return inboxMode ? 'open' : 'all';
}

export function RepositoriesPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedRepo = searchParams.get('repo') ?? '';
  const inboxMode = !selectedRepo;
  const status = parseStatus(searchParams.get('status'), inboxMode);

  const [repos, setRepos] = useState<RepositorySummary[]>([]);
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [counts, setCounts] = useState<PullRequestCounts>(DEFAULT_COUNTS);
  const [total, setTotal] = useState(0);
  const [filter, setFilter] = useState('');
  const [loadingRepos, setLoadingRepos] = useState(true);
  const [loadingPrs, setLoadingPrs] = useState(false);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentPr, setAgentPr] = useState<PullRequestItem | null>(null);

  useEffect(() => {
    if (!user) return;
    const repoParam = searchParams.get('repo');
    if (repoParam) {
      navigate(repoPath(repoParam), { replace: true });
    }
  }, [user, searchParams, navigate]);

  const loadPrs = useCallback(() => {
    if (!user) return;

    setLoadingPrs(true);
    fetchPullRequests({
      repo: selectedRepo || undefined,
      status,
      sort: status === 'open' ? 'oldest' : 'newest',
    })
      .then((data) => {
        setPullRequests(data.items);
        setCounts(data.counts);
        setTotal(data.total);
      })
      .catch(() => {
        setPullRequests([]);
        setCounts(DEFAULT_COUNTS);
        setTotal(0);
      })
      .finally(() => setLoadingPrs(false));
  }, [user, selectedRepo, status]);

  useEffect(() => {
    if (!user) return;
    setLoadingRepos(true);
    fetchRepositories(500)
      .then(setRepos)
      .catch(() => setRepos([]))
      .finally(() => setLoadingRepos(false));
  }, [user]);

  useEffect(() => {
    loadPrs();
  }, [loadPrs]);

  const filteredRepos = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return repos;
    return repos.filter((r) => r.fullName.toLowerCase().includes(q));
  }, [repos, filter]);

  function updateParams(next: { repo?: string; status?: PullRequestStatusFilter }) {
    const params = new URLSearchParams(searchParams);
    if (next.repo === undefined || next.repo === '') {
      params.delete('repo');
    } else {
      params.set('repo', next.repo);
    }
    if (next.status) {
      params.set('status', next.status);
    }
    setSearchParams(params);
  }

  function selectInbox() {
    updateParams({ repo: '' });
  }

  function selectRepo(fullName: string) {
    navigate(repoPath(fullName));
  }

  function setStatus(next: PullRequestStatusFilter) {
    updateParams({ status: next });
  }

  const openAgent = useCallback((pr?: PullRequestItem) => {
    setAgentPr(pr ?? null);
    setAgentOpen(true);
  }, []);

  if (!user) {
    return (
      <LoggedOutLanding
        title="Your cross-repo PR inbox"
        description="Browse every pull request you've opened — filter by repo, status, or scan your full inbox at once."
        onLogin={login}
      />
    );
  }

  const panelTitle = inboxMode ? 'PR inbox' : selectedRepo;
  const panelSubtitle = inboxMode
    ? `${counts.open} open · ${counts.merged} merged · oldest open first`
    : `${total} pull request${total === 1 ? '' : 's'}`;

  const emptyMessage = inboxMode
    ? status === 'open'
      ? 'No open PRs — everything is merged or closed.'
      : 'No pull requests match this filter.'
    : 'No pull requests found for this repo. Try syncing again if you expect some here.';

  return (
    <>
      <PageHeader
        eyebrow="Pull requests"
        title="My PRs"
        description={
          inboxMode
            ? 'All your PRs in one place — filter by status or drill into a repo.'
            : `Every PR you've raised in ${selectedRepo}.`
        }
        actions={
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => openAgent()}
          >
            PR assistant
          </button>
        }
      />

      <main className="page-main flex flex-col gap-4 lg:flex-row lg:items-start">
        <aside className="w-full lg:w-72 lg:shrink-0">
          <Panel title="Browse" subtitle={`${repos.length} repos`}>
            <button
              type="button"
              onClick={selectInbox}
              className={['list-picker-item mb-2', inboxMode ? 'list-picker-item-active' : ''].join(' ')}
            >
              <span className="font-medium">All PRs</span>
              <span className="tabular-nums text-[10px] font-semibold opacity-70">{counts.all}</span>
            </button>
            <input
              type="text"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="filter repos…"
              className="input mb-3"
            />
            {loadingRepos ? (
              <div className="skeleton h-40 rounded-md" />
            ) : (
              <ul className="list-picker scroll-area max-h-[360px] overflow-y-auto">
                {filteredRepos.map((repo) => (
                  <li key={repo.id}>
                    <button
                      type="button"
                      onClick={() => selectRepo(repo.fullName)}
                      className={[
                        'list-picker-item',
                        selectedRepo === repo.fullName ? 'list-picker-item-active' : '',
                      ].join(' ')}
                    >
                      <span className="truncate text-xs font-medium">{repo.fullName}</span>
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

        <div className="min-w-0 flex-1 space-y-3">
          <PullRequestStatusTabs status={status} counts={counts} onChange={setStatus} />

          <Panel flush title={panelTitle} subtitle={panelSubtitle}>
            <PullRequestTable
              pullRequests={pullRequests}
              loading={loadingPrs}
              showRepository={inboxMode}
              emptyMessage={emptyMessage}
              onAskAgent={openAgent}
            />
          </Panel>
        </div>
      </main>

      <AgentPanel open={agentOpen} onClose={() => setAgentOpen(false)} pullRequest={agentPr} />
    </>
  );
}
