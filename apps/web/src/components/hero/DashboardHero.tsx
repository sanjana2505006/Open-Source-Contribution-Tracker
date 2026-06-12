import { type ReactNode } from 'react';
import { SwarmCanvas } from './SwarmCanvas';
import { ContributorCrowd } from './ContributorCrowd';

type Props = {
  title: string;
  highlight: string;
  description: string;
  footnote?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  ctaNote?: ReactNode;
  meta?: ReactNode;
  fullScreen?: boolean;
  solo?: boolean;
  children?: ReactNode;
};

export function DashboardHero({
  title,
  highlight,
  description,
  footnote,
  primaryAction,
  secondaryAction,
  ctaNote,
  meta,
  fullScreen = false,
  solo = false,
  children,
}: Props) {
  return (
    <section
      className={[
        'hero-mirofish',
        fullScreen && 'hero-mirofish--fullscreen',
        solo && 'hero-mirofish--solo',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="hero-mirofish__ambient" aria-hidden>
        <SwarmCanvas />
      </div>

      <div className="hero-mirofish__center">
        <h1 className="hero-mirofish__title">
          {title}{' '}
          <span className="hero-mirofish__highlight">
            {highlight}
            <svg className="hero-mirofish__underline" viewBox="0 0 200 12" preserveAspectRatio="none" aria-hidden>
              <path
                d="M2 8 C40 2, 80 10, 120 6 S180 4, 198 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
              />
            </svg>
          </span>
        </h1>

        <p className="hero-mirofish__subtitle">{description}</p>

        {(primaryAction || secondaryAction) && (
          <div className="hero-mirofish__ctas">
            {primaryAction}
            {secondaryAction}
          </div>
        )}

        {ctaNote && <div className="hero-mirofish__cta-note">{ctaNote}</div>}

        {footnote && <p className="hero-mirofish__footnote">{footnote}</p>}

        {children}

        {meta && <div className="hero-mirofish__meta">{meta}</div>}
      </div>

      <ContributorCrowd />
    </section>
  );
}
