import type { HeatmapWeek } from '@osct/shared';
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react';
import { buildRevealPath, heatmapGridSize } from './heatmapReveal';

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

export function HeatmapRevealOverlay({ weeks, year, active }: Props) {
  const pathRef = useRef<SVGPathElement>(null);
  const [pathD, setPathD] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [done, setDone] = useState(false);
  const [pathLength, setPathLength] = useState(0);

  const { width, height } = heatmapGridSize(weeks.length);

  useEffect(() => {
    if (!active || prefersReducedMotion()) {
      setPathD(null);
      setPlaying(false);
      setDone(false);
      return;
    }

    const next = buildRevealPath(weeks, year);
    setPathD(next);
    setPlaying(Boolean(next));
    setDone(false);

    const tDone = window.setTimeout(() => {
      setPlaying(false);
      setDone(true);
    }, 2200);

    return () => window.clearTimeout(tDone);
  }, [active, weeks, year]);

  useLayoutEffect(() => {
    if (!pathRef.current) return;
    setPathLength(pathRef.current.getTotalLength());
  }, [pathD]);

  if (prefersReducedMotion()) return null;

  const offsetPath = pathD ? `path('${pathD}')` : undefined;

  return (
    <div
      className={`contribution-heatmap__reveal${playing ? ' contribution-heatmap__reveal--playing' : ''}${done ? ' contribution-heatmap__reveal--done' : ''}`}
      style={{ width, height, '--scan-width': `${width}px` } as CSSProperties}
      aria-hidden
    >
      {playing && <div className="contribution-heatmap__reveal-scan" />}

      {pathD && (
        <svg
          className="contribution-heatmap__reveal-svg"
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
        >
          <path
            className="contribution-heatmap__reveal-path-glow"
            d={pathD}
            style={{ '--path-length': pathLength } as CSSProperties}
          />
          <path
            ref={pathRef}
            className="contribution-heatmap__reveal-path"
            d={pathD}
            style={{ '--path-length': pathLength } as CSSProperties}
          />
        </svg>
      )}

      {playing && offsetPath && (
        <div
          className="contribution-heatmap__reveal-dot"
          style={{ offsetPath, WebkitOffsetPath: offsetPath } as CSSProperties}
        />
      )}
    </div>
  );
}
