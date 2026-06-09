import type { AnalyticsBundle } from '@osct/shared';
import { ActivityChart } from '../charts/ActivityChart';
import { LanguageChart } from '../charts/LanguageChart';
import { PullRequestChart } from '../charts/PullRequestChart';
import { DateRangeFilter, rangeToQuery, type RangePreset } from './DateRangeFilter';
import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../lib/api';

export function AnalyticsPanel() {
  const [range, setRange] = useState<RangePreset>('12m');
  const [data, setData] = useState<AnalyticsBundle | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);

    const query = rangeToQuery(range);
    fetchAnalytics(query.from, query.to)
      .then((bundle) => {
        if (!cancelled) setData(bundle);
      })
      .catch(() => {
        if (!cancelled) setData(null);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [range]);

  return (
    <section className="mt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium">Analytics</h3>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      {loading && (
        <p className="font-mono text-xs text-[var(--color-muted)]">loading charts…</p>
      )}

      {!loading && data && (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-4 lg:col-span-2">
            <p className="mb-3 text-xs text-[var(--color-muted)]">Activity by month</p>
            <ActivityChart data={data.timeline} />
          </div>

          <div className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
            <p className="mb-3 text-xs text-[var(--color-muted)]">Pull requests</p>
            <PullRequestChart data={data.pullRequests} />
          </div>

          <div className="rounded border border-[var(--color-border)] bg-[var(--color-panel)] p-4">
            <p className="mb-3 text-xs text-[var(--color-muted)]">By language</p>
            <LanguageChart data={data.languages} />
          </div>
        </div>
      )}
    </section>
  );
}
