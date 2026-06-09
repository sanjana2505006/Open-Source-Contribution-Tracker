import type { ReactNode } from 'react';
import type { ContributorProfile } from '@osct/shared';
import { ActivityChart } from '../charts/ActivityChart';
import { LanguageChart } from '../charts/LanguageChart';
import { PullRequestChart } from '../charts/PullRequestChart';
import { Panel } from './Panel';
import { RepoList } from './RepoList';
import { StatCard } from './StatCard';

type Props = {
  profile: ContributorProfile;
  statIcons: {
    pr: ReactNode;
    repo: ReactNode;
    commit: ReactNode;
  };
};

export function ContributorDashboard({ profile, statIcons }: Props) {
  return (
    <>
      <section className="grid gap-4 sm:grid-cols-3">
        <StatCard
          label="Pull requests"
          value={profile.stats.pullRequests}
          accent="var(--color-pr)"
          icon={statIcons.pr}
        />
        <StatCard
          label="Repositories"
          value={profile.stats.repositories}
          accent="var(--color-repo)"
          icon={statIcons.repo}
        />
        <StatCard
          label="Commits (recent)"
          value={profile.stats.commits}
          accent="var(--color-commit)"
          icon={statIcons.commit}
        />
      </section>

      <section className="mt-8 grid gap-4 lg:grid-cols-2">
        <Panel title="Activity" subtitle="Public PRs and commits by month" className="lg:col-span-2">
          <ActivityChart data={profile.analytics.timeline} />
        </Panel>
        <Panel title="Pull requests" subtitle="Public PR breakdown">
          <PullRequestChart data={profile.analytics.pullRequests} />
        </Panel>
        <Panel title="Languages" subtitle="From public PR activity">
          <LanguageChart data={profile.analytics.languages} />
        </Panel>
      </section>

      {profile.repositories.length > 0 && (
        <div className="mt-8">
          <Panel
            title="Repositories"
            subtitle={`${profile.repositories.length} repos with public activity`}
          >
            <RepoList repos={profile.repositories} />
          </Panel>
        </div>
      )}
    </>
  );
}
