import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { SwarmCanvas } from './SwarmCanvas';

const DashboardHeroCanvas = lazy(() =>
  import('./DashboardHeroCanvas').then((m) => ({ default: m.DashboardHeroCanvas })),
);

function HeroFallback() {
  return (
    <div className="hero-fallback hero-fallback--immersive" aria-hidden>
      <span className="hero-fallback__ring hero-fallback__ring--1" />
      <span className="hero-fallback__ring hero-fallback__ring--2" />
      <span className="hero-fallback__core" />
    </div>
  );
}

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
};

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReduced(mq.matches);
    const handler = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  return reduced;
}

export function DashboardHero({ eyebrow, title, description, actions }: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const id = requestAnimationFrame(() => setSceneReady(true));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  return (
    <section className={`hero-immersive animate-fade-up ${sceneReady ? 'hero-immersive--open' : ''}`}>
      <div className="hero-immersive__stage" aria-hidden>
        {!reducedMotion && <SwarmCanvas />}
        {!reducedMotion ? (
          <Suspense fallback={<HeroFallback />}>
            {sceneReady && <DashboardHeroCanvas />}
          </Suspense>
        ) : (
          <HeroFallback />
        )}
      </div>

      <div className="hero-immersive__scrim" aria-hidden />

      <div className="hero-immersive__content">
        {eyebrow && <p className="hero-immersive__eyebrow">{eyebrow}</p>}
        <h2 className="hero-immersive__title">{title}</h2>
        {description && <p className="hero-immersive__description">{description}</p>}
        {actions && <div className="hero-immersive__actions">{actions}</div>}
      </div>
    </section>
  );
}
