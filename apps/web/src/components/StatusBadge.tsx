type Status = 'open' | 'merged' | 'closed' | 'stale';

type Props = {
  status: Status;
  label?: string;
};

const CLASS: Record<Status, string> = {
  open: 'badge badge-open',
  merged: 'badge badge-merged',
  closed: 'badge badge-closed',
  stale: 'badge badge-stale',
};

export function StatusBadge({ status, label }: Props) {
  return <span className={CLASS[status]}>{label ?? status}</span>;
}
