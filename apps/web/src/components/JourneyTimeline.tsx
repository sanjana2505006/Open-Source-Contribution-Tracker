import type { MilestoneItem, MilestoneType } from '@osct/shared';

function typeLabel(type: MilestoneType): string {
  switch (type) {
    case 'account_linked':
      return 'start';
    case 'first_contribution':
      return 'first';
    case 'first_pull_request':
      return 'pr';
    case 'first_merged_pr':
      return 'merge';
    case 'tenth_pr':
      return '10th';
    case 'hundredth_contribution':
      return '100';
    default:
      return 'milestone';
  }
}

function typeAccent(type: MilestoneType): string {
  switch (type) {
    case 'first_merged_pr':
      return 'border-[var(--color-ok)] bg-[var(--color-ok)]/15 text-[var(--color-ok)]';
    case 'first_pull_request':
    case 'tenth_pr':
      return 'border-[var(--color-accent)] bg-[var(--color-accent)]/15 text-[var(--color-accent)]';
    case 'hundredth_contribution':
      return 'border-amber-500/50 bg-amber-500/10 text-amber-400';
    default:
      return 'border-[var(--color-border)] bg-[var(--color-surface)] text-[var(--color-muted)]';
  }
}

type Props = {
  milestones: MilestoneItem[];
  loading?: boolean;
};

export function JourneyTimeline({ milestones, loading }: Props) {
  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="skeleton h-20 rounded-md" />
        ))}
      </div>
    );
  }

  if (milestones.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--color-muted)]">
        No milestones yet. Sync from GitHub on Overview to build your timeline.
      </p>
    );
  }

  return (
    <ol className="relative space-y-0">
      {milestones.map((milestone, index) => {
        const isLast = index === milestones.length - 1;
        const content = (
          <div className="min-w-0 flex-1 rounded-md border border-[var(--color-border)] bg-[var(--color-surface)]/60 px-4 py-3.5 transition-colors hover:border-[var(--color-border-strong)]">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-medium">{milestone.title}</p>
                {milestone.description && (
                  <p className="mt-1 text-xs leading-relaxed text-[var(--color-muted)]">
                    {milestone.description}
                  </p>
                )}
                {milestone.repositoryFullName && (
                  <p className="mt-2 font-mono text-[10px] text-[var(--color-muted)]">
                    {milestone.repositoryFullName}
                  </p>
                )}
              </div>
              <time
                dateTime={milestone.occurredAt}
                className="shrink-0 font-mono text-[11px] text-[var(--color-muted)]"
              >
                {new Date(milestone.occurredAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })}
              </time>
            </div>
          </div>
        );

        return (
          <li key={milestone.id} className="relative flex gap-4 pb-8">
            {!isLast && (
              <span
                className="absolute left-[15px] top-8 h-[calc(100%-8px)] w-px bg-[var(--color-border)]"
                aria-hidden
              />
            )}
            <span
              className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border font-mono text-[9px] uppercase ${typeAccent(milestone.type)}`}
            >
              {typeLabel(milestone.type)}
            </span>
            {milestone.htmlUrl ? (
              <a
                href={milestone.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)]"
              >
                {content}
              </a>
            ) : (
              <div className="min-w-0 flex-1">{content}</div>
            )}
          </li>
        );
      })}
    </ol>
  );
}
