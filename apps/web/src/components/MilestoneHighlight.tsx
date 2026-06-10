import type { MilestoneItem } from '@osct/shared';

type Props = {
  label: string;
  milestone: MilestoneItem | null;
  accent: 'accent' | 'ok';
};

export function MilestoneHighlight({ label, milestone, accent }: Props) {
  const accentClass =
    accent === 'ok'
      ? 'border-[var(--color-ok)]/30 bg-[var(--color-ok)]/5'
      : 'border-[var(--color-accent)]/30 bg-[var(--color-accent)]/5';

  if (!milestone) {
    return (
      <div className={`rounded-md border border-dashed px-4 py-4 ${accentClass}`}>
        <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">Not reached yet</p>
      </div>
    );
  }

  const body = (
    <>
      <p className="text-[11px] uppercase tracking-wide text-[var(--color-muted)]">{label}</p>
      <p className="mt-2 text-sm font-medium">{milestone.description ?? milestone.title}</p>
      {milestone.repositoryFullName && (
        <p className="mt-1.5 font-mono text-[10px] text-[var(--color-muted)]">
          {milestone.repositoryFullName}
        </p>
      )}
      <time
        dateTime={milestone.occurredAt}
        className="mt-2 block font-mono text-[11px] text-[var(--color-muted)]"
      >
        {new Date(milestone.occurredAt).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        })}
      </time>
    </>
  );

  if (milestone.htmlUrl) {
    return (
      <a
        href={milestone.htmlUrl}
        target="_blank"
        rel="noreferrer"
        className={`block rounded-md border px-4 py-4 transition-colors hover:border-[var(--color-border-strong)] ${accentClass}`}
      >
        {body}
      </a>
    );
  }

  return <div className={`rounded-md border px-4 py-4 ${accentClass}`}>{body}</div>;
}
