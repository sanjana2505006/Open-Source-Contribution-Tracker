import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type {
  IssueItem,
  PullRequestCounts,
  PullRequestItem,
  PullRequestStatusFilter,
  RepositorySummary,
} from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { IssueTable } from '../components/IssueTable';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { PullRequestStatusTabs } from '../components/PullRequestStatusTabs';
import { PullRequestTable } from '../components/PullRequestTable';
import { PullRequestIcon } from '../components/icons/PullRequestIcon';
import { StatCard, StatCardSkeleton } from '../components/StatCard';
import { fetchIssues, fetchPullRequests, fetchRepositories } from '../lib/api';
import { repoFullName } from '../lib/repoPath';

const DEFAULT_PR_COUNTS: PullRequestCounts = { all: 0, open: 0, merged: 0, closed: 0 };

type RepoTab = 'prs' | 'issues';

export function RepoPage() {
  const { owner, name } = useParams<{ owner: string; name: string }>();
  const { user, login } = useAuth();
  const fullName = owner && name ? repoFullName(owner, name) : '';

  const [repo, setRepo] = useState<RepositorySummary | null>(null);
  const [prStatus, setPrStatus] = useState<PullRequestStatusFilter>('all');
  const [tab, setTab] = useState<RepoTab>('prs');
  const [pullRequests, setPullRequests] = useState<PullRequestItem[]>([]);
  const [prCounts, setPrCounts] = useState<PullRequestCounts>(DEFAULT_PR_COUNTS);
  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [issueCounts, setIssueCounts] = useState({ all: 0, open: 0, stuck: 0 });
  const [loading, setLoading] = useState(true);
  const [loadingList, setLoadingList] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const loadRepo = useCallback(async () => {
    if (!user || !fullName) return;

    setLoading(true);
    setNotFound(false);
    try {
      const repos = await fetchRepositories(500);
      const match = repos.find((r) => r.fullName.toLowerCase() === fullName.toLowerCase());
      if (!match) {
        setRepo(null);
        setNotFound(true);
        return;
      }
      setRepo(match);

      const [prData, issueData] = await Promise.all([
        fetchPullRequests({ repo: match.fullName, status: 'all' }),
        fetchIssues({ repo: match.fullName, role: 'all', status: 'all' }).catch(() => null),
      ]);

      setPrCounts(prData.counts);
      setIssueCounts({
        all: issueData?.counts.all ?? 0,
        open: issueData?.counts.open ?? 0,
        stuck: issueData?.counts.stuck ?? 0,
      });
    } catch {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [user, fullName]);

  const loadList = useCallback(async () => {
    if (!user || !fullName || !repo) return;

    setLoadingList(true);
    try {
      if (tab === 'prs') {
        const data = await fetchPullRequests({
          repo: fullName,
          status: prStatus,
          sort: prStatus === 'open' ? 'oldest' : 'newest',
        });
        setPullRequests(data.items);
      } else {
        const data = await fetchIssues({ repo: fullName, role: 'all', status: 'all' });
        setIssues(data.items);
      }
    } catch {
      if (tab === 'prs') setPullRequests([]);
      else setIssues([]);
    } finally {
      setLoadingList(false);
    }
  }, [user, fullName, repo, tab, prStatus]);

  useEffect(() => {
    loadRepo();
  }, [loadRepo]);

  useEffect(() => {
    if (repo) loadList();
  }, [repo, loadList]);

  const lastActive = useMemo(() => {
    if (!repo?.lastContributedAt) return null;
    return new Date(repo.lastContributedAt).toLocaleDateString();
  }, [repo]);

  if (!user) {
    return (
      <LoggedOutLanding
        title="Repository drill-down"
        description="Sign in to see your pull requests, issues, and activity per repository."
        onLogin={login}
      />
    );
  }

  if (!owner || !name) {
    return <Navigate to="/repos" replace />;
  }

  if (!loading && notFound) {
    return (
      <>
        <PageHeader eyebrow="Repository" title={fullName} description="Not in your synced repos." />
        <main className="page-main">
          <Panel title="Not found" subtitle="Repo not in your sync data">
            <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
              This repo isn&apos;t in your OSCT data yet. Sync from GitHub or pick a repo from{' '}
              <Link to="/" className="font-medium text-[var(--color-accent)] hover:underline">
                Overview
              </Link>
              .
            </p>
          </Panel>
        </main>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Repository"
        title={fullName}
        description={
          repo
            ? [
                repo.primaryLanguage,
                lastActive ? `Last activity ${lastActive}` : null,
                repo.contributionCount > 0 ? `${repo.contributionCount} contributions tracked` : null,
              ]
                .filter(Boolean)
                .join(' · ')
            : 'Loading repository…'
        }
      >
        <div className="mt-4 flex flex-wrap gap-2">
          <Link to="/repos" className="btn btn-secondary text-sm">
            ← All PRs
          </Link>
          {repo && (
            <a
              href={repo.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-ghost text-sm"
            >
              Open on GitHub ↗
            </a>
          )}
          {issueCounts.stuck > 0 && (
            <Link
              to={`/issues?repo=${encodeURIComponent(fullName)}&role=stuck`}
              className="btn btn-ghost text-sm text-[var(--color-warn)]"
            >
              {issueCounts.stuck} stuck issue{issueCounts.stuck === 1 ? '' : 's'}
            </Link>
          )}
        </div>
      </PageHeader>

      <main className="page-main space-y-6">
        {loading ? (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </section>
        ) : (
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              label="Open PRs"
              value={prCounts.open}
              accent="var(--color-open)"
              icon={<PullRequestIcon />}
            />
            <StatCard
              label="Merged PRs"
              value={prCounts.merged}
              accent="var(--color-merged)"
              icon={
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M5.45 5.154A4.25 4.25 0 019.25 3.5h1.5a4.25 4.25 0 013.8 6.707l-2.968 4.818A1.25 1.25 0 0110.626 17h-5.25a1.25 1.25 0 01-1.07-1.894l2.968-4.818A4.248 4.248 0 015.45 5.154z" />
                </svg>
              }
            />
            <StatCard
              label="Issues"
              value={issueCounts.all}
              accent="var(--color-warn)"
              hint={issueCounts.open > 0 ? `${issueCounts.open} open` : undefined}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
                  <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
                </svg>
              }
            />
            <StatCard
              label="Stuck"
              value={issueCounts.stuck}
              accent="var(--color-warn)"
              hint={issueCounts.stuck > 0 ? '30+ days idle' : 'All clear'}
              icon={
                <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                  <path d="M8 4.754a3.246 3.246 0 100 6.492 3.246 3.246 0 000-6.492zM5.754 8a2.246 2.246 0 114.492 0 2.246 2.246 0 01-4.492 0z" />
                  <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 01-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 01-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 01.52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 011.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 011.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 01.52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 01-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 01-1.255-.52l-.094-.319z" />
                </svg>
              }
            />
          </section>
        )}

        <div className="repo-detail-tabs">
          <button
            type="button"
            onClick={() => setTab('prs')}
            className={['repo-detail-tabs__btn', tab === 'prs' && 'repo-detail-tabs__btn--active']
              .filter(Boolean)
              .join(' ')}
          >
            Pull requests ({prCounts.all})
          </button>
          <button
            type="button"
            onClick={() => setTab('issues')}
            className={['repo-detail-tabs__btn', tab === 'issues' && 'repo-detail-tabs__btn--active']
              .filter(Boolean)
              .join(' ')}
          >
            Issues ({issueCounts.all})
          </button>
        </div>

        {tab === 'prs' && (
          <div className="space-y-3">
            <PullRequestStatusTabs status={prStatus} counts={prCounts} onChange={setPrStatus} />
            <Panel flush title="Pull requests" subtitle={`${pullRequests.length} shown`}>
              <PullRequestTable
                pullRequests={pullRequests}
                loading={loadingList}
                showRepository={false}
                emptyMessage="No pull requests in this repo for the selected filter."
              />
            </Panel>
          </div>
        )}

        {tab === 'issues' && (
          <Panel
            flush
            title="Issues"
            subtitle={
              issueCounts.stuck > 0
                ? `${issueCounts.open} open · ${issueCounts.stuck} stuck`
                : `${issueCounts.all} synced from GitHub`
            }
          >
            <IssueTable
              issues={issues}
              loading={loadingList}
              emptyMessage="No issues synced for this repo. Run issue sync from My Issues."
            />
          </Panel>
        )}
      </main>
    </>
  );
}
