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
  emptyMessage?: string;
};

export function IssueTable({
  issues,
  loading,
  showRepository = false,
  emptyMessage = 'No issues found. Sync from GitHub to pull assigned, commented, and opened issues.',
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

            {showRepository && (
              <span className="shrink-0 rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted)] ring-1 ring-[var(--color-border)]">
                {issue.repositoryFullName}
              </span>
            )}

            <a
              href={issue.htmlUrl}
              target="_blank"
              rel="noreferrer"
              className="min-w-0 flex-1 text-sm transition-colors group-hover:text-[var(--color-accent)]"
            >
              {issue.title}
            </a>

            <time
              dateTime={issue.occurredAt}
              className="tabular-nums shrink-0 text-[11px] font-medium text-[var(--color-muted)]"
            >
              {new Date(issue.occurredAt).toLocaleDateString()}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}
