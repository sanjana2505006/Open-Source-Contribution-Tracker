import type { HeatmapWeek } from '@osct/shared';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { buildContributionCrawlPath, heatmapGridSize } from './heatmapCrawl';

type Props = {
  weeks: HeatmapWeek[];
  year: number;
  active: boolean;
};

function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function HeatmapCrawlOverlay({ weeks, year, active }: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathD, setPathD] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [webLength, setWebLength] = useState(0);
  const [done, setDone] = useState(false);

  const { width, height } = heatmapGridSize(weeks.length);

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setPathD(null);
      setPlaying(false);
      setDone(false);
      return;
    }

    const nextPath = buildContributionCrawlPath(weeks, year);
    setPathD(nextPath);
    setPlaying(Boolean(nextPath));
    setDone(false);
  }, [active, weeks, year]);

  useLayoutEffect(() => {
    if (!playing || !pathRef.current) return;
    setWebLength(pathRef.current.getTotalLength());
  }, [playing, pathD]);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(() => {
      setPlaying(false);
      setDone(true);
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [playing, pathD]);

  if (!pathD || prefersReducedMotion()) return null;

  const offsetPath = `path('${pathD}')`;

  return (
    <div
      className={`contribution-heatmap__crawl${playing ? ' contribution-heatmap__crawl--playing' : ''}${done ? ' contribution-heatmap__crawl--done' : ''}`}
      style={{ width, height }}
      aria-hidden
    >
      <svg
        className="contribution-heatmap__crawl-svg"
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
      >
        <path
          ref={pathRef}
          className="contribution-heatmap__web-path"
          d={pathD}
          style={{ '--web-length': webLength } as CSSProperties}
        />
      </svg>

      {playing && (
        <div
          className="contribution-heatmap__spider"
          style={{ offsetPath, WebkitOffsetPath: offsetPath } as CSSProperties}
        >
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
            <circle cx="12" cy="13" r="4.5" fill="currentColor" />
            <ellipse cx="12" cy="9.5" rx="3" ry="2.8" fill="currentColor" />
            <g stroke="currentColor" strokeWidth="1.4" strokeLinecap="round">
              <line x1="9" y1="8" x2="4" y2="4" />
              <line x1="11" y1="7" x2="8" y2="2" />
              <line x1="13" y1="7" x2="16" y2="2" />
              <line x1="15" y1="8" x2="20" y2="4" />
              <line x1="8.5" y1="15" x2="3" y2="18" />
              <line x1="10" y1="16" x2="7" y2="22" />
              <line x1="14" y1="16" x2="17" y2="22" />
              <line x1="15.5" y1="15" x2="21" y2="18" />
            </g>
          </svg>
        </div>
      )}
    </div>
  );
}
