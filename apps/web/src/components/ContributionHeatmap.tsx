import type { ContributionHeatmap, HeatmapDay, HeatmapWeek } from '@osct/shared';
import { useEffect, useMemo, useState, type CSSProperties, type FocusEvent, type MouseEvent } from 'react';
import { HeatmapRevealOverlay } from './HeatmapRevealOverlay';
import { revealIndex } from './heatmapReveal';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

type TooltipState = {
  day: HeatmapDay;
  x: number;
  y: number;
};

function monthLabels(weeks: HeatmapWeek[], year: number): (string | null)[] {
  let lastMonth = -1;

  return weeks.map((week) => {
    const first = week.days.find((day) => day.date.startsWith(String(year)));
    if (!first) return null;

    const month = new Date(`${first.date}T12:00:00Z`).getUTCMonth();
    if (month === lastMonth) return null;
    lastMonth = month;
    return MONTHS[month] ?? null;
  });
}

function formatTooltip(day: HeatmapDay): string {
  const date = new Date(`${day.date}T12:00:00Z`).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  if (day.count === 0) {
    return `No contributions on ${date}`;
  }

  const noun = day.count === 1 ? 'contribution' : 'contributions';
  return `${day.count} ${noun} on ${date}`;
}

function showTooltip(
  day: HeatmapDay,
  target: HTMLElement,
  setTooltip: (value: TooltipState | null) => void,
) {
  const rect = target.getBoundingClientRect();
  setTooltip({
    day,
    x: rect.left + rect.width / 2,
    y: rect.top,
  });
}

function dayAppearance(day: HeatmapDay, inYear: boolean): {
  level: 0 | 1 | 2 | 3 | 4;
  color?: string;
} {
  if (!inYear) {
    return { level: 0 };
  }

  if (day.color) {
    return { level: day.level, color: day.color };
  }

  return { level: day.level };
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

type Props = {
  data: ContributionHeatmap;
  loading?: boolean;
  onYearChange: (year: number) => void;
};

export function ContributionHeatmap({ data, loading, onYearChange }: Props) {
  const labels = useMemo(() => monthLabels(data.weeks, data.year), [data.weeks, data.year]);
  const [tooltip, setTooltip] = useState<TooltipState | null>(null);
  const [revealing, setRevealing] = useState(false);

  useEffect(() => {
    if (loading || prefersReducedMotion() || data.weeks.length === 0) {
      setRevealing(false);
      return;
    }

    setRevealing(true);
    const cellCount = data.weeks.length * 7;
    const duration = Math.min(2200, cellCount * 1.8 + 400);
    const timer = window.setTimeout(() => setRevealing(false), duration);
    return () => window.clearTimeout(timer);
  }, [loading, data.year, data.weeks]);

  function handleDayEnter(
    event: MouseEvent<HTMLButtonElement> | FocusEvent<HTMLButtonElement>,
    day: HeatmapDay,
    inYear: boolean,
  ) {
    if (!inYear) return;
    showTooltip(day, event.currentTarget, setTooltip);
  }

  return (
    <div className="contribution-heatmap">
      <div className="contribution-heatmap__header">
        <p className="contribution-heatmap__total">
          <strong>{loading ? '…' : data.totalContributions.toLocaleString()}</strong>
          {' contributions in '}
          {data.year}
        </p>
      </div>

      <div className="contribution-heatmap__body">
        <div className="contribution-heatmap__chart">
          <div className="contribution-heatmap__months" aria-hidden>
            <span className="contribution-heatmap__month-spacer" />
            {labels.map((label, index) => (
              <span key={`month-${index}`} className="contribution-heatmap__month">
                {label}
              </span>
            ))}
          </div>

          <div className="contribution-heatmap__grid">
            <div className="contribution-heatmap__weekdays" aria-hidden>
              <span />
              <span>Mon</span>
              <span />
              <span>Wed</span>
              <span />
              <span>Fri</span>
              <span />
            </div>

            <div className="contribution-heatmap__weeks-wrap">
              <div className={`contribution-heatmap__weeks${loading ? ' contribution-heatmap__weeks--loading' : ''}`}>
                {data.weeks.map((week, weekIndex) => (
                  <div key={`week-${weekIndex}`} className="contribution-heatmap__week">
                    {week.days.map((day, dayIndex) => {
                      const inYear = day.date.startsWith(String(data.year));
                      const { level, color } = dayAppearance(day, inYear);
                      const isActive = inYear && level > 0;
                      const index = revealIndex(weekIndex, dayIndex);

                      return (
                        <button
                          key={`${weekIndex}-${day.date}`}
                          type="button"
                          className={`contribution-heatmap__day${revealing && isActive ? ' contribution-heatmap__day--reveal' : ''}`}
                          data-level={color ? undefined : level}
                          style={{
                            ...(color ? { backgroundColor: color } : {}),
                            ...(revealing && isActive
                              ? ({ '--reveal-i': index } as CSSProperties)
                              : {}),
                          }}
                          aria-label={inYear ? formatTooltip(day) : undefined}
                          onMouseEnter={(event) => handleDayEnter(event, day, inYear)}
                          onMouseLeave={() => setTooltip(null)}
                          onFocus={(event) => handleDayEnter(event, day, inYear)}
                          onBlur={() => setTooltip(null)}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>

              <HeatmapRevealOverlay weeks={data.weeks} year={data.year} active={!loading} />
            </div>
          </div>
        </div>

        <div className="contribution-heatmap__years" role="tablist" aria-label="Contribution year">
          {data.years.map((year) => (
            <button
              key={year}
              type="button"
              role="tab"
              aria-selected={year === data.year}
              className={
                year === data.year
                  ? 'contribution-heatmap__year contribution-heatmap__year--active'
                  : 'contribution-heatmap__year'
              }
              onClick={() => onYearChange(year)}
            >
              {year}
            </button>
          ))}
        </div>
      </div>

      {tooltip && (
        <div
          className="contribution-heatmap__tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
          role="tooltip"
        >
          {formatTooltip(tooltip.day)}
        </div>
      )}

      <div className="contribution-heatmap__footer">
        <span className="contribution-heatmap__hint">Daily activity from GitHub</span>
        <div className="contribution-heatmap__legend" aria-hidden>
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <span key={level} className="contribution-heatmap__day" data-level={level} />
          ))}
          <span>More</span>
        </div>
      </div>
    </div>
  );
}
