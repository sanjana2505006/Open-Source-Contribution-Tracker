import { useEffect, useRef, useState, type ComponentType } from 'react';
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
  { id: 'back', depth: 0.25, scale: 0.5, opacity: 0.28, blur: 3, lift: 28, count: 16, delay: 0.1 },
  { id: 'mid', depth: 0.55, scale: 0.72, opacity: 0.55, blur: 1, lift: 14, count: 13, delay: 0.25 },
  { id: 'front', depth: 1, scale: 1, opacity: 1, blur: 0, lift: 0, count: 11, delay: 0.42 },
];

type FigureProps = { className?: string };

function CrowdLayer({
  layer,
  offset,
  ready,
}: {
  layer: LayerConfig;
  offset: { x: number; y: number };
  ready: boolean;
}) {
  const figures: ComponentType<FigureProps>[] = [];
  for (let i = 0; i < layer.count; i++) {
    figures.push(CROWD_FIGURES[i % CROWD_FIGURES.length]!);
  }

  const shiftX = offset.x * layer.depth * 48;
  const shiftY = offset.y * layer.depth * 14;

  return (
    <div
      className={`hero-crowd__layer hero-crowd__layer--${layer.id} ${ready ? 'hero-crowd__layer--in' : ''}`}
      style={{
        opacity: layer.opacity,
        filter: layer.blur ? `blur(${layer.blur}px)` : undefined,
        transform: `translate3d(${shiftX}px, ${ready ? layer.lift + shiftY : layer.lift + 90}px, 0) scale(${layer.scale})`,
        transitionDelay: `${layer.delay}s`,
      }}
      aria-hidden
    >
      <div className="hero-crowd__row">
        {figures.map((Figure, i) => (
          <Figure key={`${layer.id}-${i}`} className="hero-crowd__figure" />
        ))}
      </div>
    </div>
  );
}

export function ContributorCrowd() {
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [ready, setReady] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = mq.matches;
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
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
    <div className="hero-crowd" onMouseMove={onMove} onMouseLeave={onLeave} aria-hidden>
      <div className="hero-crowd__fade" />
      {LAYERS.map((layer) => (
        <CrowdLayer key={layer.id} layer={layer} offset={offset} ready={ready} />
      ))}
    </div>
  );
}
