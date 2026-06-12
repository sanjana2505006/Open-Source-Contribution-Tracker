import type { PortfolioInsights } from '@osct/shared';
import { IssueTable } from './IssueTable';
import { Panel } from './Panel';

type Props = {
  insights: PortfolioInsights;
  isOwner?: boolean;
};

export function PublicStuckIssuesPanel({ insights, isOwner }: Props) {
  const { stuckIssueCount, stuckIssues } = insights;

  return (
    <Panel
      flush
      title="Stuck issues"
      subtitle={
        stuckIssueCount > 0
          ? `${stuckIssueCount} open issue${stuckIssueCount === 1 ? '' : 's'} with no activity for 30+ days`
          : 'No stuck issues — synced from OSCT'
      }
    >
      <div className="public-stuck-issues__banner">
        <span className="public-stuck-issues__badge">OSCT insight</span>
        <p className="public-stuck-issues__copy">
          {stuckIssueCount > 0
            ? isOwner
              ? 'These are your idle issues from OSCT — share this portfolio to show where you may need help unblocking.'
              : 'This contributor uses OSCT — stuck issues are synced from their GitHub activity, not visible on a normal profile.'
            : isOwner
              ? 'You have no stuck issues right now. Nice work staying on top of things.'
              : 'This contributor has no stuck issues in their synced OSCT data.'}
        </p>
      </div>

      {stuckIssueCount > 0 ? (
        <>
          <IssueTable
            issues={stuckIssues}
            variant="stuck"
            showRepository
            emptyMessage="No stuck issues."
          />
          {stuckIssueCount > stuckIssues.length && (
            <p className="px-4 pb-4 text-xs text-[var(--color-muted)]">
              Showing {stuckIssues.length} of {stuckIssueCount} stuck issues.
              {isOwner && (
                <>
                  {' '}
                  <a href="/issues?role=stuck" className="font-medium text-[var(--color-accent)] hover:underline">
                    View all in My Issues
                  </a>
                </>
              )}
            </p>
          )}
        </>
      ) : (
        <p className="px-4 py-8 text-center text-sm text-[var(--color-muted)]">
          Nothing stuck — all synced issues have recent activity.
        </p>
      )}
    </Panel>
  );
}
