import type { PullRequestCounts, PullRequestStatusFilter } from '@osct/shared';

const TABS: Array<{ id: PullRequestStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'merged', label: 'Merged' },
  { id: 'closed', label: 'Closed' },
];

type Props = {
  status: PullRequestStatusFilter;
  counts: PullRequestCounts;
  onChange: (status: PullRequestStatusFilter) => void;
};

export function PullRequestStatusTabs({ status, counts, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {TABS.map((tab) => {
        const active = status === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={[
              'inline-flex items-center gap-2 rounded-md px-3 py-1.5 text-xs transition-colors',
              active
                ? 'bg-[var(--color-accent)]/15 text-[var(--color-text)] ring-1 ring-[var(--color-accent)]/30'
                : 'bg-[var(--color-surface)] text-[var(--color-muted)] hover:text-[var(--color-text)]',
            ].join(' ')}
          >
            {tab.label}
            <span className="font-mono text-[10px] opacity-70">{counts[tab.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
