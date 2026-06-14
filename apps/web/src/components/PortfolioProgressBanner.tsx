import type { ContributionStreak, ContributorProfile } from '@osct/shared';
import { StatCard } from './StatCard';

type Props = {
  profile: ContributorProfile;
  streak?: ContributionStreak | null;
};

export function PortfolioProgressBanner({ profile, streak }: Props) {
  const { stats } = profile;

  return (
    <section className="portfolio-progress">
      <div className="portfolio-progress__header">
        <p className="portfolio-progress__eyebrow">Open source highlights</p>
        <h3 className="portfolio-progress__title">Recent progress</h3>
        <p className="portfolio-progress__subtitle">
          What recruiters and collaborators see — your momentum, not private issue tracking.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {streak && streak.currentStreak > 0 && (
          <StatCard
            label="Current streak"
            value={`${streak.currentStreak}d`}
            accent="var(--color-ok)"
            hint={
              streak.activeThisWeek
                ? `Longest ${streak.longestStreak} days · active this week`
                : `Longest ${streak.longestStreak} days`
            }
            icon={
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
                <path d="M8 14c-.55 0-1-.45-1-1 0-.28.12-.53.31-.71C5.78 11.53 4 9.13 4 6.5 4 3.46 6.46 1 9.5 1c2.02 0 3.86 1.05 4.91 2.74.32.52.15 1.2-.37 1.52A1.25 1.25 0 0113 5.5c0 .41-.2.78-.5 1.01.67.55 1 1.35 1 2.24 0 1.93-1.57 3.5-3.5 3.5H9.5c-.28.18-.5.43-.5.71 0 .55-.45 1-1 1z" />
              </svg>
            }
          />
        )}
        <StatCard
          label="Pull requests"
          value={stats.pullRequests}
          accent="var(--color-pr)"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M1.5 3.25a2.25 2.25 0 113 0v5.5a.75.75 0 01-1.5 0v-5.5a.75.75 0 00-1.5 0v8.5a2.25 2.25 0 105.5 0V7a.75.75 0 011.5 0v2.75a3.75 3.75 0 11-7.5 0v-6.5zM14.25 6a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5a.75.75 0 01.75-.75zm-2-2.5a2.25 2.25 0 110 4.5 2.25 2.25 0 010-4.5z" />
            </svg>
          }
        />
        <StatCard
          label="Repositories"
          value={stats.repositories}
          accent="var(--color-repo)"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-7a1 1 0 00-1 1v1H4.5a.75.75 0 010-1.5H6V3.25a.5.5 0 01.5-.5h7v9h-7a2.5 2.5 0 01-2.5-2.5V2.5z" />
            </svg>
          }
        />
        <StatCard
          label="Recent commits"
          value={stats.commits}
          accent="var(--color-commit)"
          icon={
            <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
              <path d="M11.93 8.5a4.002 4.002 0 01-7.86 0H.75a.75.75 0 010-1.5h3.32a4.002 4.002 0 017.86 0h3.32a.75.75 0 010 1.5h-3.32zM8 9a2.5 2.5 0 100-5 2.5 2.5 0 000 5z" />
            </svg>
          }
        />
      </div>
    </section>
  );
}
