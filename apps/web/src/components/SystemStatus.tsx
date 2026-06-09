import type { HealthResponse } from '@osct/shared';

type StatusDotProps = {
  ok: boolean;
  label: string;
};

function StatusDot({ ok, label }: StatusDotProps) {
  return (
    <span className="inline-flex items-center gap-2 font-mono text-xs">
      <span
        className="inline-block h-2 w-2 rounded-full"
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
    return <p className="font-mono text-xs text-[var(--color-muted)]">checking services…</p>;
  }

  if (error) {
    return <StatusDot ok={false} label="api unreachable" />;
  }

  if (!health) return null;

  return (
    <div className="flex flex-wrap gap-4">
      <StatusDot ok={health.status === 'ok'} label={`api ${health.status}`} />
      <StatusDot ok={health.db === 'up'} label={`postgres ${health.db}`} />
    </div>
  );
}
