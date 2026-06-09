import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  accent: string;
  icon: ReactNode;
  delay?: string;
};

export function StatCard({ label, value, accent, icon, delay = '' }: StatCardProps) {
  return (
    <div
      className={`panel panel-interactive animate-fade-up relative overflow-hidden px-4 py-5 ${delay}`}
    >
      <div
        className="absolute inset-y-0 left-0 w-1"
        style={{ background: accent }}
      />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="text-xs text-[var(--color-muted)]">{label}</p>
          <p
            className="mt-2 font-mono text-3xl font-medium tabular-nums tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </p>
        </div>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
          style={{ background: `${accent}18`, color: accent }}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

export function StatCardSkeleton() {
  return (
    <div className="panel px-4 py-5">
      <div className="skeleton h-3 w-20 rounded" />
      <div className="skeleton mt-4 h-8 w-16 rounded" />
    </div>
  );
}
