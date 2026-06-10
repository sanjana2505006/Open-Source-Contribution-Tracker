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

type Props = {
  pullRequests: PullRequestItem[];
  loading?: boolean;
};

export function PullRequestTable({ pullRequests, loading }: Props) {
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
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">
        No pull requests found for this repo. Try syncing again if you expect some here.
      </p>
    );
  }

  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {pullRequests.map((pr) => (
        <li key={pr.id}>
          <a
            href={pr.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex flex-wrap items-center gap-3 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]"
          >
            <span
              className={`shrink-0 rounded px-2 py-0.5 font-mono text-[10px] uppercase ${statusClass(pr)}`}
            >
              {statusLabel(pr)}
            </span>
            <span className="min-w-0 flex-1 text-sm group-hover:text-[var(--color-accent)]">
              {pr.title}
            </span>
            <time
              dateTime={pr.occurredAt}
              className="shrink-0 font-mono text-[11px] text-[var(--color-muted)]"
            >
              {new Date(pr.occurredAt).toLocaleDateString()}
            </time>
          </a>
        </li>
      ))}
    </ul>
  );
}
