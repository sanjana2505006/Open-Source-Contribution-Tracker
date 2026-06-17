import { useSearchParams } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { IssueCounts, IssueItem, IssueRoleFilter, IssueStatusFilter } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { IssueFilterTabs } from '../components/IssueFilterTabs';
import { IssueTable } from '../components/IssueTable';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { fetchIssues, syncIssuesOnly } from '../lib/api';
import { AgentPanel } from '../components/agent/AgentPanel';

const DEFAULT_COUNTS: IssueCounts = {
  all: 0,
  open: 0,
  closed: 0,
  assigned: 0,
  authored: 0,
  commented: 0,
  stuck: 0,
};

function parseRole(value: string | null): IssueRoleFilter {
  if (
    value === 'assigned' ||
    value === 'commented' ||
    value === 'authored' ||
    value === 'stuck' ||
    value === 'all'
  ) {
    return value;
  }
  return 'all';
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
  const selectedRepo = searchParams.get('repo')?.trim() ?? '';

  const [issues, setIssues] = useState<IssueItem[]>([]);
  const [counts, setCounts] = useState<IssueCounts>(DEFAULT_COUNTS);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentIssue, setAgentIssue] = useState<IssueItem | null>(null);

  const loadIssues = useCallback(() => {
    if (!user) return;

    setLoading(true);
    setError(null);
    fetchIssues({ role, status, repo: selectedRepo || undefined })
      .then((data) => {
        setIssues(data.items);
        setCounts(data.counts);
        setTotal(data.total);
      })
      .catch((err: unknown) => {
        setIssues([]);
        setCounts(DEFAULT_COUNTS);
        setTotal(0);
        setError(err instanceof Error ? err.message : 'Failed to load issues');
      })
      .finally(() => setLoading(false));
  }, [user, role, status, selectedRepo]);

  useEffect(() => {
    loadIssues();
  }, [loadIssues]);

  function setRole(next: IssueRoleFilter) {
    const params = new URLSearchParams(searchParams);
    params.set('role', next);
    if (next === 'stuck') {
      params.delete('status');
    }
    setSearchParams(params);
  }

  function setStatus(next: IssueStatusFilter) {
    const params = new URLSearchParams(searchParams);
    params.set('status', next);
    setSearchParams(params);
  }

  async function handleSyncIssues() {
    setSyncing(true);
    setError(null);
    setSyncMessage(null);
    try {
      const result = await syncIssuesOnly();
      setSyncMessage(`Synced ${result.issueCount} issues from GitHub.`);
      loadIssues();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Issue sync failed');
    } finally {
      setSyncing(false);
    }
  }

  if (!user) {
    return (
      <LoggedOutLanding
        title="Track your GitHub issues"
        description="See issues assigned to you, ones you've commented on, and issues you've opened — all in one inbox."
        onLogin={login}
      />
    );
  }

  const emptyMessage =
    role === 'stuck'
      ? 'Nothing stuck right now — open issues with no activity for 30+ days show up here after sync.'
      : role === 'assigned'
        ? 'No assigned issues yet. When a maintainer assigns you work, it will show up here after sync.'
        : role === 'commented'
          ? 'No commented issues yet. Issues where you left a comment (including "please assign me") appear here.'
          : role === 'authored'
            ? 'No opened issues yet.'
            : 'No issues match this filter. Try syncing from GitHub on Overview.';

  const panelTitle = role === 'stuck' ? 'Stuck issues' : 'Issue inbox';
  const panelSubtitle =
    role === 'stuck'
      ? `${total} open issue${total === 1 ? '' : 's'} with no activity for 30+ days`
      : `${total} issue${total === 1 ? '' : 's'} · ${counts.assigned} assigned · ${counts.commented} commented`;

  return (
    <>
      <PageHeader
        eyebrow="Issues"
        title="My Issues"
        description={
          selectedRepo
            ? `Filtered to ${selectedRepo}${role === 'stuck' ? ' · stuck issues only' : ''}.`
            : role === 'stuck'
              ? 'Issues you commented on, were assigned, or opened — but nothing has moved in 30+ days.'
              : "Issues assigned to you, ones you've commented on, and issues you've opened — all in one inbox."
        }
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setAgentIssue(null);
                setAgentOpen(true);
              }}
              className="btn btn-secondary"
            >
              Issue assistant
            </button>
            <button
              type="button"
              onClick={handleSyncIssues}
              disabled={syncing}
              className="btn btn-primary"
            >
              {syncing ? 'Syncing issues…' : 'Sync issues from GitHub'}
            </button>
          </>
        }
      />

      <main className="page-main space-y-3">
        {error && <p className="alert alert-error">{error}</p>}
        {syncMessage && <p className="alert alert-success">{syncMessage}</p>}

        <IssueFilterTabs
          role={role}
          status={status}
          counts={counts}
          onRoleChange={setRole}
          onStatusChange={setStatus}
        />

        <Panel flush title={panelTitle} subtitle={panelSubtitle}>
          {!loading && !error && total === 0 && (
            <p className="border-b border-[var(--color-border)] px-4 py-3 text-sm text-[var(--color-muted)]">
              No issues saved yet. Click <strong>Sync issues from GitHub</strong> above — it only
              pulls issues (much faster than a full sync on Overview).
            </p>
          )}
          <IssueTable
            issues={issues}
            loading={loading}
            showRepository
            variant={role === 'stuck' ? 'stuck' : 'default'}
            emptyMessage={emptyMessage}
            onAskAgent={(issue) => {
              setAgentIssue(issue);
              setAgentOpen(true);
            }}
          />
        </Panel>
      </main>

      <AgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        issue={agentIssue}
      />
    </>
  );
}
