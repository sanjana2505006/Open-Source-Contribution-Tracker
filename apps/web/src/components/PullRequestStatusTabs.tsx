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
    <div className="segmented" role="tablist" aria-label="PR status filter">
      {TABS.map((tab) => {
        const active = status === tab.id;
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.id)}
            className={['segmented-item', active ? 'segmented-item-active' : ''].join(' ')}
          >
            {tab.label}
            <span className="font-mono text-[10px] tabular-nums opacity-60">{counts[tab.id]}</span>
          </button>
        );
      })}
    </div>
  );
}
