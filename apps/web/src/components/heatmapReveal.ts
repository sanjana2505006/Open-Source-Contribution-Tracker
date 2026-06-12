import type { HeatmapWeek } from '@osct/shared';

export const HEATMAP_CELL = 13;
export const HEATMAP_GAP = 3;
export const HEATMAP_STEP = HEATMAP_CELL + HEATMAP_GAP;

export type Point = { x: number; y: number };

export function heatmapGridSize(weekCount: number): { width: number; height: number } {
  return {
    width: weekCount * HEATMAP_STEP - HEATMAP_GAP,
    height: 7 * HEATMAP_STEP - HEATMAP_GAP,
  };
}

function cellCenter(weekIndex: number, dayIndex: number): Point {
  return {
    x: weekIndex * HEATMAP_STEP + HEATMAP_CELL / 2,
    y: dayIndex * HEATMAP_STEP + HEATMAP_CELL / 2,
  };
}

export function collectActiveCells(
  weeks: HeatmapWeek[],
  year: number,
): Array<Point & { date: string; weekIndex: number; dayIndex: number }> {
  const points: Array<Point & { date: string; weekIndex: number; dayIndex: number }> = [];

  weeks.forEach((week, weekIndex) => {
    week.days.forEach((day, dayIndex) => {
      if (!day.date.startsWith(String(year)) || day.level === 0) return;
      points.push({ ...cellCenter(weekIndex, dayIndex), date: day.date, weekIndex, dayIndex });
    });
  });

  points.sort((a, b) => a.date.localeCompare(b.date));
  return points;
}

/** Gentle path through the year — reads as a data trace, not a swing arc. */
export function buildRevealPath(
  weeks: HeatmapWeek[],
  year: number,
  maxPoints = 48,
): string | null {
  const points = collectActiveCells(weeks, year);
  if (points.length < 2) return null;

  let sampled = points;
  if (points.length > maxPoints) {
    const stride = Math.ceil(points.length / maxPoints);
    sampled = points.filter((_, index) => index % stride === 0);
    const last = points[points.length - 1]!;
    if (sampled[sampled.length - 1]?.date !== last.date) {
      sampled.push(last);
    }
  }

  const first = sampled[0]!;
  let path = `M ${first.x.toFixed(1)} ${first.y.toFixed(1)}`;

  for (let i = 1; i < sampled.length; i++) {
    const curr = sampled[i]!;
    path += ` L ${curr.x.toFixed(1)} ${curr.y.toFixed(1)}`;
  }

  return path;
}

export function revealIndex(weekIndex: number, dayIndex: number): number {
  return weekIndex * 7 + dayIndex;
}
