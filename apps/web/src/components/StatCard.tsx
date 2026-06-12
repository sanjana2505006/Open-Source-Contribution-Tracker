import type { ReactNode } from 'react';

type StatCardProps = {
  label: string;
  value: string | number;
  accent: string;
  icon: ReactNode;
  delay?: string;
  hint?: string;
};

export function StatCard({ label, value, accent, icon, delay = '', hint }: StatCardProps) {
  return (
    <div
      className={`panel panel-interactive animate-fade-up relative overflow-hidden px-4 py-5 ${delay}`}
    >
      <div
        className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-20 blur-2xl"
        style={{ background: accent }}
      />
      <div
        className="absolute inset-y-0 left-0 w-1 rounded-l-[12px]"
        style={{ background: accent }}
      />
      <div className="relative flex items-start justify-between gap-3 pl-2">
        <div>
          <p className="eyebrow text-[10px]">{label}</p>
          <p
            className="tabular-nums mt-2 text-3xl font-semibold tracking-tight"
            style={{ color: accent }}
          >
            {value}
          </p>
          {hint && <p className="mt-1 text-[11px] text-[var(--color-muted)]">{hint}</p>}
        </div>
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-[var(--color-border)]"
          style={{ background: `${accent}14`, color: accent }}
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
      <div className="skeleton h-3 w-24 rounded" />
      <div className="skeleton mt-4 h-9 w-20 rounded" />
    </div>
  );
}
