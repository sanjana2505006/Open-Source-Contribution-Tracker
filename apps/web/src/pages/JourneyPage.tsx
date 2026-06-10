import { useEffect, useState } from 'react';
import type { JourneyBundle } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { EmptyState } from '../components/EmptyState';
import { JourneyTimeline } from '../components/JourneyTimeline';
import { MilestoneHighlight } from '../components/MilestoneHighlight';
import { Panel } from '../components/Panel';
import { fetchJourney } from '../lib/api';

export function JourneyPage() {
  const { user, login } = useAuth();
  const [journey, setJourney] = useState<JourneyBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setJourney(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchJourney()
      .then((data) => {
        if (!cancelled) setJourney(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Failed to load journey');
          setJourney(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  if (!user) {
    return (
      <main className="p-6">
        <EmptyState
          title="Sign in to see your journey"
          description="A timeline of your first PR, first merge, and other open-source milestones."
          action={
            <button
              type="button"
              onClick={login}
              className="rounded-md bg-[var(--color-accent)] px-5 py-2.5 text-sm font-medium text-white"
            >
              Sign in with GitHub
            </button>
          }
        />
      </main>
    );
  }

  return (
    <>
      <header className="border-b border-[var(--color-border)] px-6 py-5">
        <h2 className="text-xl font-medium tracking-tight">Contribution journey</h2>
        <p className="mt-1 text-sm text-[var(--color-muted)]">
          Milestones from your synced GitHub activity — first PR, first merge, and beyond.
        </p>
      </header>

      <main className="space-y-4 p-6">
        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <MilestoneHighlight
            label="First pull request"
            milestone={journey?.highlights.firstPullRequest ?? null}
            accent="accent"
          />
          <MilestoneHighlight
            label="First merged PR"
            milestone={journey?.highlights.firstMergedPr ?? null}
            accent="ok"
          />
        </div>

        <Panel
          title="Timeline"
          subtitle={
            journey
              ? `${journey.milestones.length} milestone${journey.milestones.length === 1 ? '' : 's'}`
              : 'Your open-source story in order'
          }
        >
          <JourneyTimeline milestones={journey?.milestones ?? []} loading={loading} />
        </Panel>
      </main>
    </>
  );
}
