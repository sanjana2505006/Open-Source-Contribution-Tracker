import type { HeatmapWeek } from '@osct/shared';

export const HEATMAP_CELL = 13;
export const HEATMAP_GAP = 3;
export const HEATMAP_STEP = HEATMAP_CELL + HEATMAP_GAP;

export type HeatmapGridSize = {
  width: number;
  height: number;
};

export function heatmapGridSize(weekCount: number): HeatmapGridSize {
  return {
    width: weekCount * HEATMAP_STEP - HEATMAP_GAP,
    height: 7 * HEATMAP_STEP - HEATMAP_GAP,
  };
}

/** Chronological path through contributed days — subsampled for a ~4s crawl. */
export function buildContributionCrawlPath(
  weeks: HeatmapWeek[],
  year: number,
  maxPoints = 48,
): string | null {
  const points: { x: number; y: number; date: string }[] = [];

  weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, dayIndex) => {
      if (!day.date.startsWith(String(year)) || day.level === 0) return;
      points.push({
        x: weekIndex * HEATMAP_STEP + HEATMAP_CELL / 2,
        y: dayIndex * HEATMAP_STEP + HEATMAP_CELL / 2,
        date: day.date,
      });
    });
  });

  if (points.length < 2) return null;

  points.sort((a, b) => a.date.localeCompare(b.date));

  let sampled = points;
  if (points.length > maxPoints) {
    const stride = Math.ceil(points.length / maxPoints);
    sampled = points.filter((_, index) => index % stride === 0);
    const last = points[points.length - 1]!;
    if (sampled[sampled.length - 1]?.date !== last.date) {
      sampled.push(last);
    }
  }

  return sampled
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`)
    .join(' ');
}
