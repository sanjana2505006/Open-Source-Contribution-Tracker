import { useEffect, useRef, useState, type ComponentType, type CSSProperties } from 'react';
import { CROWD_FIGURES } from './crowdFigures';

type LayerConfig = {
  id: string;
  depth: number;
  scale: number;
  opacity: number;
  blur: number;
  lift: number;
  count: number;
  delay: number;
};

const LAYERS: LayerConfig[] = [
  { id: 'back', depth: 0.3, scale: 0.55, opacity: 0.45, blur: 2, lift: 24, count: 14, delay: 0.05 },
  { id: 'mid', depth: 0.6, scale: 0.78, opacity: 0.78, blur: 0.5, lift: 12, count: 12, delay: 0.12 },
  { id: 'front', depth: 1, scale: 1, opacity: 1, blur: 0, lift: 0, count: 10, delay: 0.2 },
];

/** Extra silhouette tiers — wider, darker, overlapping for a packed-crowd feel. */
const SHADOW_LAYERS: LayerConfig[] = [
  { id: 'shadow-far', depth: 0.12, scale: 0.36, opacity: 1, blur: 5, lift: 34, count: 28, delay: 0 },
  { id: 'shadow-mid', depth: 0.2, scale: 0.48, opacity: 1, blur: 3, lift: 22, count: 22, delay: 0.04 },
  { id: 'shadow-near', depth: 0.28, scale: 0.62, opacity: 1, blur: 1.5, lift: 10, count: 16, delay: 0.08 },
];

/** Slide distance from left or right based on seat in the row. */
function enterOffset(index: number, total: number, depth: number, spreadBoost = 1): number {
  const center = (total - 1) / 2;
  const spread = (1.35 + (1 - depth) * 0.65) * spreadBoost;

  if (index < center) {
    return (-200 - (center - index) * 72) * spread;
  }
  if (index > center) {
    return (200 + (index - center) * 72) * spread;
  }
  return index % 2 === 0 ? -120 * spread : 120 * spread;
}

type FigureProps = { className?: string; style?: React.CSSProperties };

function CrowdLayer({
  layer,
  offset,
  assembled,
  animate,
}: {
  layer: LayerConfig;
  offset: { x: number; y: number };
  assembled: boolean;
  animate: boolean;
}) {
  const figures: ComponentType<FigureProps>[] = [];
  for (let i = 0; i < layer.count; i++) {
    figures.push(CROWD_FIGURES[i % CROWD_FIGURES.length]!);
  }

  const shiftX = offset.x * layer.depth * 55;
  const shiftY = offset.y * layer.depth * 16;

  return (
    <div
      className={`hero-crowd__layer hero-crowd__layer--${layer.id}`}
      style={{
        opacity: layer.opacity,
        filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        transform: `translate3d(${shiftX}px, ${layer.lift + shiftY}px, 0) scale(${layer.scale})`,
      }}
      aria-hidden
    >
      <div className="hero-crowd__row">
        {figures.map((Figure, i) => {
          const wrapStyle = {
            '--enter-x': `${enterOffset(i, figures.length, layer.depth)}px`,
            '--assemble-delay': `${i * 0.065 + layer.delay}s`,
          } as CSSProperties;

          return (
            <div
              key={`${layer.id}-${i}`}
              className={[
                'hero-crowd__figure-wrap',
                animate && 'hero-crowd__figure-wrap--enter',
                assembled && 'hero-crowd__figure-wrap--color',
              ]
                .filter(Boolean)
                .join(' ')}
              style={wrapStyle}
            >
              <Figure
                className="hero-crowd__figure"
                style={
                  assembled
                    ? { animationDelay: `${i * 0.1 + layer.delay}s` }
                    : undefined
                }
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CrowdShadowLayer({
  layer,
  offset,
  animate,
}: {
  layer: LayerConfig;
  offset: { x: number; y: number };
  animate: boolean;
}) {
  const figures: ComponentType<FigureProps>[] = [];
  for (let i = 0; i < layer.count; i++) {
    figures.push(CROWD_FIGURES[(i + 3) % CROWD_FIGURES.length]!);
  }

  const shiftX = offset.x * layer.depth * 70;
  const shiftY = offset.y * layer.depth * 12;
  const rowSpread = layer.id === 'shadow-far' ? 1.55 : layer.id === 'shadow-mid' ? 1.28 : 1.1;

  return (
    <div
      className={`hero-crowd__shadow-layer hero-crowd__shadow-layer--${layer.id}`}
      style={{
        filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        transform: `translate3d(${shiftX}px, ${layer.lift + shiftY}px, 0) scale(${layer.scale * rowSpread})`,
        opacity: layer.id === 'shadow-far' ? 0.55 : layer.id === 'shadow-mid' ? 0.72 : 0.88,
      }}
      aria-hidden
    >
      <div className="hero-crowd__shadow-row">
        {figures.map((Figure, i) => {
          const wrapStyle = {
            '--enter-x': `${enterOffset(i, figures.length, layer.depth, 1.85)}px`,
            '--assemble-delay': `${i * 0.04 + layer.delay}s`,
            '--shadow-jitter': `${((i * 7) % 5) - 2}px`,
            zIndex: i % 3,
          } as CSSProperties;

          return (
            <div
              key={`${layer.id}-${i}`}
              className={[
                'hero-crowd__shadow-wrap',
                animate && 'hero-crowd__shadow-wrap--enter',
              ]
                .filter(Boolean)
                .join(' ')}
              style={wrapStyle}
            >
              <Figure className="hero-crowd__shadow-figure" />
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Longest figure finishes entering, then color fades in. */
const ASSEMBLE_MS = 2600;

export function ContributorCrowd() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [assembled, setAssembled] = useState(false);
  const [animate, setAnimate] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;

    if (mq.matches) {
      setAnimate(false);
      setAssembled(true);
      return;
    }

    const startId = requestAnimationFrame(() => setAnimate(true));
    const doneId = window.setTimeout(() => setAssembled(true), ASSEMBLE_MS);

    return () => {
      cancelAnimationFrame(startId);
      window.clearTimeout(doneId);
    };
  }, []);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    if (reducedRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setOffset({
      x: (e.clientX - rect.left) / rect.width - 0.5,
      y: (e.clientY - rect.top) / rect.height - 0.5,
    });
  }

  function onLeave() {
    setOffset({ x: 0, y: 0 });
  }

  return (
    <div
      className={['hero-crowd', assembled && 'hero-crowd--assembled'].filter(Boolean).join(' ')}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      aria-hidden
    >
      <div className="hero-crowd__glow" />
      <div className="hero-crowd__ground-shadow" aria-hidden />
      <div className="hero-crowd__shadows">
        {SHADOW_LAYERS.map((layer) => (
          <CrowdShadowLayer key={layer.id} layer={layer} offset={offset} animate={animate} />
        ))}
      </div>
      <div className="hero-crowd__fade" />
      {LAYERS.map((layer) => (
        <CrowdLayer
          key={layer.id}
          layer={layer}
          offset={offset}
          assembled={assembled}
          animate={animate}
        />
      ))}
    </div>
  );
}
