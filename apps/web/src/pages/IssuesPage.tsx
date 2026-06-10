import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { IssueCounts, IssueItem, IssueRoleFilter, IssueStatusFilter } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { EmptyState } from '../components/EmptyState';
import { IssueFilterTabs } from '../components/IssueFilterTabs';
import { IssueTable } from '../components/IssueTable';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { fetchIssues } from '../lib/api';

const DEFAULT_COUNTS: IssueCounts = {
  all: 0,
  open: 0,
  closed: 0,
  assigned: 0,
  authored: 0,
  commented: 0,
};

function parseRole(value: string | null): IssueRoleFilter {
  if (value === 'assigned' || value === 'commented' || value === 'authored' || value === 'all') {
    return value;
  }
  return 'assigned';
}

function parseStatus(value: string | null): IssueStatusFilter {
  if (value === 'open' || value === 'closed' || value === 'all') {
    return value;
  }
  return 'all';
}

export function IssuesPage() {
  const { user, login } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const role = parseRole(searchParams.get('role'));
  const status = parseStatus(searchParams.get('status'));

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [counts, setCounts] = useState<IssueCounts>(DEFAULT_COUNTS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const loadIssues = useCallback(() => {
    if (!user) return;

    setLoading(true);
    fetchIssues({ role, status })
      .then((data) => {
        setIssues(data.items);
        setCounts(data.counts);
        setTotal(data.total);
      })
      .catch(() => {
        setIssues([]);
        setCounts(DEFAULT_COUNTS);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, [user, role, status]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  function setRole(next: IssueRoleFilter) {
    const params = new URLSearchParams(searchParams);
    params.set('role', next);
    setSearchParams(params);
  }

  function setStatus(next: IssueStatusFilter) {
    const params = new URLSearchParams(searchParams);
    params.set('status', next);
    setSearchParams(params);
  }

  if (!user) {
    return (
      <main className="page-main">
        <EmptyState
          icon="inbox"
          title="Sign in to see your issues"
          description="Track issues assigned to you, ones you've commented on, and issues you've opened."
          action={
            <button type="button" onClick={login} className="btn btn-primary">
              Sign in with GitHub
            </button>
          }
        />
      </main>
    );
  }

  const emptyMessage =
    role === 'assigned'
      ? 'No assigned issues yet. When a maintainer assigns you work, it will show up here after sync.'
      : role === 'commented'
        ? 'No commented issues yet. Issues where you left a comment (including "please assign me") appear here.'
        : role === 'authored'
          ? 'No opened issues yet.'
          : 'No issues match this filter. Try syncing from GitHub on Overview.';

  return (
    <>
      <PageHeader
        eyebrow="Issues"
        title="My Issues"
        description="Issues assigned to you, ones you've commented on, and issues you've opened — all in one inbox."
      />

      <main className="page-main space-y-3">
        <IssueFilterTabs
          role={role}
          status={status}
          counts={counts}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />

        <Panel
          flush
          title="Issue inbox"
          subtitle={`${total} issue${total === 1 ? '' : 's'} · ${counts.assigned} assigned · ${counts.commented} commented`}
        >
          <IssueTable
            issues={issues}
            loading={loading}
            showRepository
            emptyMessage={emptyMessage}
          />
        </Panel>
      </main>
    </>
  );
}
