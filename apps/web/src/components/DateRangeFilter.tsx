export type RangePreset = '3m' | '6m' | '12m' | 'all';

type Props = {
  value: RangePreset;
  onChange: (value: RangePreset) => void;
};

const options: { value: RangePreset; label: string }[] = [
  { value: '3m', label: '3 mo' },
  { value: '6m', label: '6 mo' },
  { value: '12m', label: '12 mo' },
  { value: 'all', label: 'All' },
];

export function rangeToQuery(preset: RangePreset): { from?: string; to?: string } {
  const to = new Date();
  const toStr = to.toISOString().slice(0, 10);

  if (preset === 'all') {
    return { from: '2008-01-01', to: toStr };
  }

  const from = new Date(to);
  const months = preset === '3m' ? 3 : preset === '6m' ? 6 : 12;
  from.setMonth(from.getMonth() - months);

  return {
    from: from.toISOString().slice(0, 10),
    to: toStr,
  };
}

export function DateRangeFilter({ value, onChange }: Props) {
  return (
    <div className="flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={[
            'rounded px-2.5 py-1 font-mono text-xs',
            value === opt.value
              ? 'bg-[var(--color-surface)] text-[var(--color-text)]'
              : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
          ].join(' ')}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
