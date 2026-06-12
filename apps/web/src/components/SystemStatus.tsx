import type { HealthResponse } from '@osct/shared';

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 text-[10px] font-semibold text-[var(--color-muted)]">
      <span
        className={`inline-block h-1.5 w-1.5 rounded-full ${ok ? '' : 'animate-pulse-dot'}`}
        style={{ background: ok ? 'var(--color-ok)' : 'var(--color-bad)' }}
      />
      {label}
    </span>
  );
}

type SystemStatusProps = {
  health: HealthResponse | null;
  error: string | null;
  loading: boolean;
};

export function SystemStatus({ health, error, loading }: SystemStatusProps) {
  if (loading) {
    return (
      <div className="flex gap-2">
        <span className="skeleton h-6 w-16 rounded-full" />
        <span className="skeleton h-6 w-20 rounded-full" />
      </div>
    );
  }

  if (error) {
    return <StatusPill ok={false} label="api down" />;
  }

  if (!health) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <StatusPill ok={health.status === 'ok'} label={`api ${health.status}`} />
      <StatusPill ok={health.db === 'up'} label={`db ${health.db}`} />
      {health.version && (
        <span className="text-[10px] font-medium text-[var(--color-muted)]">
          v{health.version}
        </span>
      )}
    </div>
  );
}
