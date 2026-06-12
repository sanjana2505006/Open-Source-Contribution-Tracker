import type { AnalyticsBundle, ContributionStreak } from '@osct/shared';
import { ActivityChart } from '../charts/ActivityChart';
import { LanguageChart } from '../charts/LanguageChart';
import { PullRequestChart } from '../charts/PullRequestChart';
import { ContributionHeatmapPanel } from '../components/ContributionHeatmapPanel';
import { Panel } from './Panel';
import { DateRangeFilter, rangeToQuery, type RangePreset } from './DateRangeFilter';
import { useEffect, useState } from 'react';
import { fetchAnalytics } from '../lib/api';

export function AnalyticsPanel({ streak }: { streak?: ContributionStreak | null }) {
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
    <section className="mt-8 animate-fade-up">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Analytics</h3>
          <p className="text-xs text-[var(--color-muted)]">Contribution trends over time</p>
        </div>
        <DateRangeFilter value={range} onChange={setRange} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
      <div className="contribution-heatmap-wrap">
        <ContributionHeatmapPanel streak={streak} />
      </div>

        {loading && (
          <>
            <div className="panel skeleton h-64 lg:col-span-2" />
            <div className="panel skeleton h-48" />
            <div className="panel skeleton h-48" />
          </>
        )}

        {!loading && data && (
          <>
            <Panel title="Activity" subtitle="Monthly PRs and commits" className="lg:col-span-2">
              <ActivityChart data={data.timeline} />
            </Panel>

            <Panel title="Pull requests" subtitle="By status">
              <PullRequestChart data={data.pullRequests} />
            </Panel>

            <Panel title="Languages" subtitle="Top repos by activity">
              <LanguageChart data={data.languages} />
            </Panel>
          </>
        )}
      </div>
    </section>
  );
}
