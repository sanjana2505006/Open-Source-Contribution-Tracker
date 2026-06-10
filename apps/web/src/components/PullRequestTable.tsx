import { Link } from 'react-router-dom';
import type { PullRequestItem } from '@osct/shared';

function statusLabel(pr: PullRequestItem): string {
  if (pr.isMerged || pr.state === 'merged') return 'merged';
  if (pr.state === 'open') return 'open';
  return 'closed';
}

function statusClass(pr: PullRequestItem): string {
  const s = statusLabel(pr);
  if (s === 'merged') return 'bg-[var(--color-ok)]/15 text-[var(--color-ok)]';
  if (s === 'open') return 'bg-[var(--color-accent)]/15 text-[var(--color-accent)]';
  return 'bg-[var(--color-muted)]/15 text-[var(--color-muted)]';
}

function daysOpen(occurredAt: string): number {
  const opened = new Date(occurredAt).getTime();
  return Math.floor((Date.now() - opened) / (1000 * 60 * 60 * 24));
}

type Props = {
  pullRequests: PullRequestItem[];
  loading?: boolean;
  showRepository?: boolean;
  emptyMessage?: string;
};

export function PullRequestTable({
  pullRequests,
  loading,
  showRepository = false,
  emptyMessage = 'No pull requests found. Try syncing again if you expect some here.',
}: Props) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3].map((i) => (
          <div key={i} className="skeleton h-12 rounded-md" />
        ))}
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">{emptyMessage}</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {pullRequests.map((pr) => {
        const openDays = statusLabel(pr) === 'open' ? daysOpen(pr.occurredAt) : null;
        const stale = openDays !== null && openDays >= 30;

        return (
          <li key={pr.id}>
            <div className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]">
              <span
                className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase ${statusClass(pr)}`}
              >
                {statusLabel(pr)}
              </span>
              {showRepository && (
                <Link
                  to={`/repos?repo=${encodeURIComponent(pr.repositoryFullName)}`}
                  className="shrink-0 font-mono text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)]"
                >
                  {pr.repositoryFullName}
                </Link>
              )}
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 text-sm hover:text-[var(--color-accent)]"
              >
                {pr.title}
              </a>
              {stale && (
                <span className="shrink-0 rounded bg-amber-500/10 px-2 py-0.5 font-mono text-[10px] text-amber-400">
                  {openDays}d open
                </span>
              )}
              <time
                dateTime={pr.occurredAt}
                className="shrink-0 font-mono text-[11px] text-[var(--color-muted)]"
              >
                {new Date(pr.occurredAt).toLocaleDateString()}
              </time>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
