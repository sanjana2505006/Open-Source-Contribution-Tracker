import { Link } from 'react-router-dom';
import type { PullRequestItem } from '@osct/shared';
import { StatusBadge } from './StatusBadge';
import { repoPath } from '../lib/repoPath';

function statusLabel(pr: PullRequestItem): 'open' | 'merged' | 'closed' {
  if (pr.isMerged || pr.state === 'merged') return 'merged';
  if (pr.state === 'open') return 'open';
  return 'closed';
}

function daysOpen(occurredAt: string): number {
  return Math.floor((Date.now() - new Date(occurredAt).getTime()) / (1000 * 60 * 60 * 24));
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
      <div className="space-y-0 divide-y divide-[var(--color-border)] p-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton m-2 h-11 rounded-lg" />
        ))}
      </div>
    );
  }

  if (pullRequests.length === 0) {
    return (
      <p className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">{emptyMessage}</p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {pullRequests.map((pr) => {
        const status = statusLabel(pr);
        const openDays = status === 'open' ? daysOpen(pr.occurredAt) : null;
        const stale = openDays !== null && openDays >= 30;

        return (
          <li key={pr.id}>
            <div className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]">
              <StatusBadge status={status} />
              {showRepository && (
                <Link
                  to={repoPath(pr.repositoryFullName)}
                  className="shrink-0 rounded-md bg-[var(--color-surface)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-muted)] ring-1 ring-[var(--color-border)] transition-colors hover:text-[var(--color-accent)] hover:ring-[var(--color-accent)]/30"
                >
                  {pr.repositoryFullName}
                </Link>
              )}
              <a
                href={pr.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 text-sm transition-colors group-hover:text-[var(--color-accent)]"
              >
                {pr.title}
              </a>
              {stale && <StatusBadge status="stale" label={`${openDays}d open`} />}
              <time
                dateTime={pr.occurredAt}
                className="tabular-nums shrink-0 text-[11px] font-medium text-[var(--color-muted)]"
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
