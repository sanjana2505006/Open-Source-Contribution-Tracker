import type { IssueCounts, IssueRoleFilter, IssueStatusFilter } from '@osct/shared';

const ROLE_TABS: Array<{ id: IssueRoleFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'assigned', label: 'Assigned' },
  { id: 'commented', label: 'Commented' },
  { id: 'authored', label: 'Opened' },
];

const STATUS_TABS: Array<{ id: IssueStatusFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'closed', label: 'Closed' },
];

type Props = {
  role: IssueRoleFilter;
  status: IssueStatusFilter;
  counts: IssueCounts;
  onRoleChange: (role: IssueRoleFilter) => void;
  onStatusChange: (status: IssueStatusFilter) => void;
};

export function IssueFilterTabs({
  role,
  status,
  counts,
  onRoleChange,
  onStatusChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
      <div className="segmented" role="tablist" aria-label="Issue role filter">
        {ROLE_TABS.map((tab) => {
          const active = role === tab.id;
          const count =
            tab.id === 'all'
              ? counts.all
              : tab.id === 'assigned'
                ? counts.assigned
                : tab.id === 'commented'
                  ? counts.commented
                  : counts.authored;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onRoleChange(tab.id)}
              className={['segmented-item', active ? 'segmented-item-active' : ''].join(' ')}
            >
              {tab.label}
              <span className="tabular-nums text-[10px] font-semibold opacity-60">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="segmented" role="tablist" aria-label="Issue status filter">
        {STATUS_TABS.map((tab) => {
          const active = status === tab.id;
          const count =
            tab.id === 'all' ? counts.all : tab.id === 'open' ? counts.open : counts.closed;

          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onStatusChange(tab.id)}
              className={['segmented-item', active ? 'segmented-item-active' : ''].join(' ')}
            >
              {tab.label}
              <span className="tabular-nums text-[10px] font-semibold opacity-60">{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
