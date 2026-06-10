import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
const DashboardHeroCanvas = lazy(() =>
  import('./DashboardHeroCanvas').then((m) => ({ default: m.DashboardHeroCanvas })),
);

function HeroFallback() {
  return (
    <div className="hero-fallback" aria-hidden>
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

export function DashboardHero({
  eyebrow,
  title,
  description,
  actions,
}: Props) {
  const reducedMotion = usePrefersReducedMotion();
  const [sceneReady, setSceneReady] = useState(false);

  useEffect(() => {
    if (reducedMotion) return;
    const id = requestAnimationFrame(() => setSceneReady(true));
    return () => cancelAnimationFrame(id);
  }, [reducedMotion]);

  return (
    <section className="hero-banner animate-fade-up">
      <div className="hero-banner__glow" aria-hidden />

      <div className="hero-banner__layout">
        <div className="hero-banner__copy">
          {eyebrow && <p className="hero-banner__eyebrow">{eyebrow}</p>}
          <h2 className="hero-banner__title">{title}</h2>
          {description && <p className="hero-banner__description">{description}</p>}

          {actions && <div className="hero-banner__actions">{actions}</div>}
        </div>

        <div className={`hero-canvas ${sceneReady ? 'hero-canvas--open' : ''}`}>
          {reducedMotion ? (
            <HeroFallback />
          ) : (
            <Suspense fallback={<HeroFallback />}>
              {sceneReady && <DashboardHeroCanvas />}
            </Suspense>
          )}
        </div>
      </div>
    </section>
  );
}
