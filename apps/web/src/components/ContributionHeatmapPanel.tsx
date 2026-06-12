import type { ContributionHeatmap, ContributionStreak } from '@osct/shared';
import { useEffect, useState } from 'react';
import { fetchHeatmap } from '../lib/api';
import { ContributionHeatmap as HeatmapChart } from './ContributionHeatmap';
import { Panel } from './Panel';

export function ContributionHeatmapPanel({ streak }: { streak?: ContributionStreak | null }) {
  const [year, setYear] = useState<number | undefined>(undefined);
  const [data, setData] = useState<ContributionHeatmap | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetchHeatmap(year)
      .then((heatmap) => {
        if (!cancelled) {
          setData(heatmap);
          if (year === undefined) {
            setYear(heatmap.year);
          }
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setData(null);
          setError(err instanceof Error ? err.message : 'Failed to load heatmap');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [year]);

  function handleYearChange(nextYear: number) {
    setYear(nextYear);
  }

  return (
    <Panel
      title="Contribution activity"
      subtitle={
        streak
          ? `${streak.currentStreak}-day streak · longest ${streak.longestStreak} days`
          : 'Your contribution trail through the year'
      }
      className="contribution-heatmap-card"
      flush
    >
      {error && (
        <p className="px-4 py-6 text-sm text-[var(--color-muted)]">{error}</p>
      )}

      {!error && (data || loading) && (
        <div className="contribution-heatmap-panel">
          <HeatmapChart
            data={
              data ?? {
                year: year ?? new Date().getFullYear(),
                totalContributions: 0,
                weeks: [],
                years: [year ?? new Date().getFullYear()],
              }
            }
            loading={loading}
            onYearChange={handleYearChange}
          />
        </div>
      )}
    </Panel>
  );
}
