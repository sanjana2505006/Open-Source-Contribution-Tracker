import { useEffect, useState } from 'react';
import type { HealthResponse } from '@osct/shared';
import { SystemStatus } from '../components/SystemStatus';
import { fetchHealth } from '../lib/api';

export function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    fetchHealth()
      .then((data) => {
        if (!cancelled) setHealth(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'request failed');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <>
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-base font-medium">Overview</h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            Connect GitHub in the next phase to pull your contribution data.
          </p>
        </div>
        <SystemStatus health={health} error={error} loading={loading} />
      </header>

      <main className="p-6">
        <section className="grid gap-4 sm:grid-cols-3">
          {[
            { label: 'Pull requests', value: '—' },
            { label: 'Repositories', value: '—' },
            { label: 'Languages', value: '—' },
          ].map((stat) => (
            <div
              key={stat.label}
              className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-5"
            >
              <p className="text-xs text-[var(--color-muted)]">{stat.label}</p>
              <p className="mt-2 font-mono text-2xl tabular-nums">{stat.value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 rounded border border-dashed border-[var(--color-border)] px-5 py-10 text-center">
          <p className="text-sm text-[var(--color-muted)]">
            No contribution data yet.
          </p>
          <p className="mt-2 font-mono text-xs text-[var(--color-muted)]">
            phase 2 · github oauth
          </p>
        </section>
      </main>
    </>
  );
}
