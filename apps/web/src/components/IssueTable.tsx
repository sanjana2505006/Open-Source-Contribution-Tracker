import type { IssueItem, IssueRole } from '@osct/shared';

function roleLabel(role: IssueRole): string {
  switch (role) {
    case 'assigned':
      return 'Assigned';
    case 'commented':
      return 'Commented';
    case 'authored':
      return 'Opened';
  }
}

function roleClass(role: IssueRole): string {
  switch (role) {
    case 'assigned':
      return 'badge-merged';
    case 'commented':
      return 'badge-open';
    case 'authored':
      return 'badge-closed';
  }
}

type Props = {
  issues: IssueItem[];
  loading?: boolean;
  showRepository?: boolean;
  variant?: 'default' | 'stuck';
  emptyMessage?: string;
  onAskAgent?: (issue: IssueItem) => void;
};

export function IssueTable({
  issues,
  loading,
  showRepository = false,
  variant = 'default',
  emptyMessage = 'No issues found. Sync from GitHub to pull assigned, commented, and opened issues.',
  onAskAgent,
}: Props) {
  if (loading) {
    return (
      <div className="space-y-0 divide-y divide-[var(--color-border)] p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton m-2 h-11 rounded-lg" />
        ))}
      </div>
    );
  }

  if (issues.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">{emptyMessage}</p>
    );
  }

  const isStuck = variant === 'stuck';

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {issues.map((issue) => (
        <li key={issue.id}>
          <div className="group flex flex-wrap items-center gap-2 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]">
            <span
              className={`badge ${issue.state === 'open' ? 'badge-open' : 'badge-closed'}`}
            >
              {issue.state ?? 'unknown'}
            </span>

            {issue.roles.map((role) => (
              <span key={role} className={`badge ${roleClass(role)}`}>
                {roleLabel(role)}
              </span>
            ))}

            {isStuck && issue.stuckDays != null && (
              <span className="badge badge-stale">{issue.stuckDays}d stuck</span>
            )}

            {showRepository && (
              <span className="shrink-0 rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                {issue.repositoryFullName}
              </span>
            )}

            <div className="min-w-0 flex-1">
              <a
                href={issue.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="block text-sm transition-colors group-hover:text-[var(--color-accent)]"
              >
                {issue.title}
              </a>
              {isStuck && issue.stuckReason && (
                <p className="mt-0.5 text-[11px] text-[var(--color-muted)]">{issue.stuckReason}</p>
              )}
            </div>

            {!isStuck && (
              <time
                dateTime={issue.occurredAt}
                className="tabular-nums shrink-0 text-[11px] font-medium text-[var(--color-muted)]"
              >
                {new Date(issue.occurredAt).toLocaleDateString()}
              </time>
            )}

            {onAskAgent && (
              <button
                type="button"
                className="agent-issue-btn"
                onClick={() => onAskAgent(issue)}
                title="Ask OSCT agent about this issue"
              >
                Ask agent
              </button>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
