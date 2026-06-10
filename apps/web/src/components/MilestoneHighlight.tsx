import type { MilestoneItem } from '@osct/shared';

type Props = {
  label: string;
  milestone: MilestoneItem | null;
  accent: 'accent' | 'ok';
};

export function MilestoneHighlight({ label, milestone, accent }: Props) {
  const accentClass =
    accent === 'ok'
      ? 'border-[var(--color-ok)]/25 bg-[var(--color-ok)]/5'
      : 'border-[var(--color-accent)]/25 bg-[var(--color-accent)]/5';

  if (!milestone) {
    return (
      <div className={`panel border-dashed px-4 py-5 ${accentClass}`}>
        <p className="eyebrow">{label}</p>
        <p className="mt-3 text-sm text-[var(--color-muted)]">Not reached yet</p>
      </div>
    );
  }

  const body = (
    <>
      <p className="eyebrow">{label}</p>
      <p className="mt-3 text-sm font-medium leading-snug">
        {milestone.description ?? milestone.title}
      </p>
      {milestone.repositoryFullName && (
        <p className="mt-2 text-[11px] font-medium text-[var(--color-muted)]">
          {milestone.repositoryFullName}
        </p>
      )}
      <time
        dateTime={milestone.occurredAt}
        className="tabular-nums mt-3 block text-[11px] font-medium text-[var(--color-muted)]"
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
        className={`panel panel-interactive block px-4 py-5 ${accentClass}`}
      >
        {body}
      </a>
    );
  }

  return <div className={`panel px-4 py-5 ${accentClass}`}>{body}</div>;
}
