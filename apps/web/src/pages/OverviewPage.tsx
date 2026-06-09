import { useEffect, useState } from 'react';
import type { HealthResponse } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { SystemStatus } from '../components/SystemStatus';
import { fetchHealth } from '../lib/api';

export function OverviewPage() {
  const { user, loading: authLoading, login } = useAuth();
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

  const oauthError =
    new URLSearchParams(window.location.search).get('error') === 'oauth_failed'
      ? 'GitHub sign-in failed. Try again.'
      : new URLSearchParams(window.location.search).get('error') === 'oauth_state'
        ? 'Sign-in session expired. Try again.'
        : null;

  return (
    <>
      <header className="flex items-center justify-between border-b border-[var(--color-border)] px-6 py-4">
        <div>
          <h2 className="text-base font-medium">Overview</h2>
          <p className="mt-0.5 text-sm text-[var(--color-muted)]">
            {user
              ? 'Signed in. Contribution sync lands in the next phase.'
              : 'Sign in with GitHub to link your account.'}
          </p>
        </div>
        <SystemStatus health={health} error={error} loading={loading} />
      </header>

      <main className="p-6">
        {oauthError && (
          <p className="mb-4 rounded border border-[var(--color-bad)]/40 bg-[var(--color-bad)]/10 px-4 py-3 text-sm text-[var(--color-bad)]">
            {oauthError}
          </p>
        )}

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

        {!authLoading && !user && (
          <section className="mt-6 rounded border border-dashed border-[var(--color-border)] px-5 py-10 text-center">
            <p className="text-sm text-[var(--color-muted)]">
              No account linked yet.
            </p>
            <button
              type="button"
              onClick={login}
              className="mt-4 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-2 text-sm hover:border-[var(--color-accent-dim)]"
            >
              Sign in with GitHub
            </button>
          </section>
        )}

        {user && (
          <section className="mt-6 rounded border border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-4">
            <p className="text-xs text-[var(--color-muted)]">Linked account</p>
            <p className="mt-1 font-mono text-sm">@{user.username}</p>
            {user.bio && (
              <p className="mt-2 text-sm text-[var(--color-muted)]">{user.bio}</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
