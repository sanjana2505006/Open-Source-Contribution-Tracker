import type { ReactNode } from 'react';

type Feature = {
  title: string;
  description: string;
  icon: ReactNode;
};

const FEATURES: Feature[] = [
  {
    title: 'Cross-repo PR inbox',
    description: 'Filter and browse pull requests across every repo you contribute to — open, merged, or closed.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1.5 3.25a2.25 2.25 0 113 0v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 00-1.5 0v8.5a2.25 2.25 0 105.5 0V7a.75.75 0 011.5 0v2.75a3.75 3.75 0 11-7.5 0v-6.5z" />
      </svg>
    ),
  },
  {
    title: 'My Issues',
    description: 'Track issues assigned to you, ones you commented on, and issues you opened — perfect for “assign me” threads.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 9.5a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" />
        <path d="M8 0a8 8 0 100 16A8 8 0 008 0zM1.5 8a6.5 6.5 0 1113 0 6.5 6.5 0 01-13 0z" />
      </svg>
    ),
  },
  {
    title: 'Contribution heatmap',
    description: 'GitHub-style daily activity grid with hover details — see your streaks at a glance.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1 1.75A.75.75 0 011.75 1h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5A.75.75 0 011 3.25v-1.5zm5 0A.75.75 0 016.75 1h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5A.75.75 0 015 3.25v-1.5zm5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5zM1 6.75A.75.75 0 011.75 6h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5A.75.75 0 011 8.25v-1.5zm5 0A.75.75 0 016.75 6h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5A.75.75 0 015 8.25v-1.5zm5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5zM1 11.75A.75.75 0 011.75 11h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5A.75.75 0 011 13.25v-1.5zm5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5zm5 0a.75.75 0 01.75-.75h1.5a.75.75 0 01.75.75v1.5a.75.75 0 01-.75.75h-1.5a.75.75 0 01-.75-.75v-1.5z" />
      </svg>
    ),
  },
  {
    title: 'Analytics dashboard',
    description: 'Monthly activity charts, PR status breakdown, and top languages across your contributions.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M3 12.5V4.5h1v8H3zm4-6v6H6V6.5h1zm4 3v3h-1v-3h1z" />
      </svg>
    ),
  },
  {
    title: 'Journey timeline',
    description: 'Milestone markers from your first contribution to latest merge — your OSS story, visualized.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 0a8 8 0 110 16A8 8 0 018 0zm3.5 4.5a.75.75 0 00-1.185-.617L8 7.443 5.685 4.883A.75.75 0 004.5 5.5v6a.75.75 0 001.185.617L8 9.557l2.315 2.56A.75.75 0 0011.5 11.5v-6z" />
      </svg>
    ),
  },
  {
    title: 'Explore contributors',
    description: 'Look up any public GitHub profile — repos, PRs, and activity charts in one view.',
    icon: (
      <svg className="h-5 w-5" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-2.122-2.122a4.5 4.5 0 105.659-5.659 4.5 4.5 0 00-5.66 5.66z" />
      </svg>
    ),
  },
];

const REASONS = [
  'One dashboard instead of jumping between dozens of repos on GitHub',
  'Never lose track of issues you commented on or asked to be assigned',
  'See your full contribution story — not just what fits on a profile README',
  'Sync once from GitHub — PRs, issues, repos, and analytics stay up to date',
  'Free to use — just sign in with your GitHub account',
];

type Props = {
  onLogin: () => void;
  compact?: boolean;
};

export function LandingFeatures({ onLogin, compact = false }: Props) {
  return (
    <section className={`landing-features${compact ? ' landing-features--compact' : ''}`}>
      <div className="landing-features__inner">
        <header className="landing-features__header">
          <p className="landing-features__eyebrow">Features</p>
          <h2 className="landing-features__title">
            Everything your GitHub profile can&apos;t show you
          </h2>
          <p className="landing-features__lead">
            OSCT pulls your open-source work into one place — PRs, issues, repos, heatmaps, and
            milestones — so you can focus on contributing, not hunting.
          </p>
        </header>

        <div className="landing-features__grid">
          {FEATURES.map((feature) => (
            <article key={feature.title} className="landing-feature-card">
              <div className="landing-feature-card__icon">{feature.icon}</div>
              <h3 className="landing-feature-card__title">{feature.title}</h3>
              <p className="landing-feature-card__desc">{feature.description}</p>
            </article>
          ))}
        </div>

        <div className="landing-signup">
          <div className="landing-signup__copy">
            <p className="landing-features__eyebrow">Why sign up?</p>
            <h2 className="landing-signup__title">Built for people who contribute across repos</h2>
            <ul className="landing-signup__list">
              {REASONS.map((reason) => (
                <li key={reason}>{reason}</li>
              ))}
            </ul>
          </div>
          <div className="landing-signup__cta">
            <p className="landing-signup__cta-text">
              Sign in with GitHub, hit sync once, and your full contribution picture is ready.
            </p>
            <button type="button" onClick={onLogin} className="btn btn-primary landing-signup__btn">
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.778-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
              Sign in with GitHub — it&apos;s free
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
