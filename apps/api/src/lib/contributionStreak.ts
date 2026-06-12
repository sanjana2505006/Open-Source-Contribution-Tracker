import type { ContributionStreak, HeatmapDay, HeatmapWeek } from '@osct/shared';

function parseDate(isoDate: string): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(Date.UTC(y!, m! - 1, d));
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function flattenHeatmapDays(weeks: HeatmapWeek[]): HeatmapDay[] {
  return weeks.flatMap((week) => week.days);
}

export function computeContributionStreak(days: HeatmapDay[]): ContributionStreak {
  const activeDays = days
    .filter((d) => d.count > 0)
    .map((d) => d.date)
    .sort();

  if (activeDays.length === 0) {
    return {
      currentStreak: 0,
      longestStreak: 0,
      activeThisWeek: false,
      lastActiveDate: null,
    };
  }

  const activeSet = new Set(activeDays);

  const today = formatDateUTC(new Date());
  let cursor = activeSet.has(today) ? today : formatDateUTC(addDays(new Date(), -1));

  let currentStreak = 0;
  while (activeSet.has(cursor)) {
    currentStreak++;
    cursor = formatDateUTC(addDays(parseDate(cursor), -1));
  }

  let longestStreak = 1;
  let run = 1;
  for (let i = 1; i < activeDays.length; i++) {
    const prev = parseDate(activeDays[i - 1]!);
    const curr = parseDate(activeDays[i]!);
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86_400_000);
    run = diffDays === 1 ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
  }

  const weekStart = addDays(new Date(), -6);
  weekStart.setUTCHours(0, 0, 0, 0);
  const activeThisWeek = days.some(
    (d) => d.count > 0 && parseDate(d.date).getTime() >= weekStart.getTime(),
  );

  return {
    currentStreak,
    longestStreak,
    activeThisWeek,
    lastActiveDate: activeDays[activeDays.length - 1] ?? null,
  };
}
