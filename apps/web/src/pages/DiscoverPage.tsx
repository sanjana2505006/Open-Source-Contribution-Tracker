import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { GoodFirstIssueItem, GoodFirstIssueRecommendations, IssueItem } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AgentPanel } from '../components/agent/AgentPanel';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  buildBeginnerMentorshipPrompt,
  goodFirstIssueToIssueItem,
} from '../lib/issueMentorship';
import { fetchGoodFirstIssues } from '../lib/recommendationsApi';
import { languageColor } from '../lib/languageColors';
import { repoPath } from '../lib/repoPath';

const JOURNEY_STEPS = [
  { title: 'Find an issue', body: 'Matched to your GitHub languages & repos' },
  { title: 'Fork & branch', body: 'Step-by-step — no guessing' },
  { title: 'Know what to edit', body: 'Files & approach for this issue' },
  { title: 'Open your PR', body: 'Description drafted for you' },
];

export function DiscoverPage() {
  const { user, login } = useAuth();
  const [data, setData] = useState<GoodFirstIssueRecommendations | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentIssue, setAgentIssue] = useState<IssueItem | null>(null);
  const [agentInitialMessage, setAgentInitialMessage] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) return;
    setLoading(true);
    setError(null);
    fetchGoodFirstIssues()
      .then(setData)
      .catch((err: unknown) => {
        setData(null);
        setError(err instanceof Error ? err.message : 'Could not load recommendations');
      })
      .finally(() => setLoading(false));
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const guideMe = useCallback(
    (issue: GoodFirstIssueItem) => {
      setAgentIssue(goodFirstIssueToIssueItem(issue));
      setAgentInitialMessage(buildBeginnerMentorshipPrompt(issue, data?.profile));
      setAgentOpen(true);
    },
    [data?.profile],
  );

  if (!user) {
    return (
      <LoggedOutLanding
        title="From issue to merged PR"
        description="The gap between finding an open-source issue and actually shipping a PR is huge. OSCT scans your GitHub profile and guides you through fork, branch, files, and your PR description."
        onLogin={login}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Discover"
        title="Your first PR starts here"
        description="We scan your GitHub profile, surface good-first issues in your stack, then walk you through everything until you're ready to open a PR — not just find a link and close the tab."
        actions={
          <button type="button" className="btn btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh matches'}
          </button>
        }
      />

      <main className="page-main space-y-4">
        <section className="discover-hero">
          <p className="discover-hero__lead">
            Most beginners find an interesting issue, then quietly close the tab.{' '}
            <strong>OSCT bridges that gap</strong> — the part between picking an issue and writing
            the actual code.
          </p>
          <ol className="discover-journey">
            {JOURNEY_STEPS.map((step, index) => (
              <li key={step.title} className="discover-journey__step">
                <span className="discover-journey__num">{index + 1}</span>
                <div>
                  <p className="discover-journey__title">{step.title}</p>
                  <p className="discover-journey__body">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {error && <p className="alert alert-error">{error}</p>}

        {loading && !data && (
          <div className="space-y-3">
            <div className="skeleton h-24 rounded-xl" />
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="skeleton h-20 rounded-xl" />
            ))}
          </div>
        )}

        {data && (
          <>
            <Panel
              title="Your tech profile"
              subtitle="Scanned from your synced GitHub contributions — we match issues to this stack"
            >
              {data.profile.languages.length === 0 ? (
                <p className="px-4 py-6 text-sm text-[var(--color-muted)]">
                  No language data yet —{' '}
                  <Link to="/" className="text-[var(--color-accent)] hover:underline">
                    sync from Overview
                  </Link>{' '}
                  so we can tailor issues to your stack.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 px-4 py-4">
                  {data.profile.languages.map((row) => (
                    <span
                      key={row.language}
                      className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface)] px-3 py-1 text-xs font-medium ring-1 ring-[var(--color-border)]"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ background: languageColor(row.language) }}
                      />
                      {row.language}
                      <span className="text-[var(--color-muted)]">{row.sharePercent}%</span>
                    </span>
                  ))}
                </div>
              )}
              {data.profile.familiarRepos.length > 0 && (
                <p className="border-t border-[var(--color-border)] px-4 py-3 text-xs text-[var(--color-muted)]">
                  Prioritizing repos you&apos;ve touched:{' '}
                  {data.profile.familiarRepos.slice(0, 4).join(', ')}
                  {data.profile.familiarRepos.length > 4 ? '…' : ''}
                </p>
              )}
            </Panel>

            <Panel
              flush
              title="Good-first issues for you"
              subtitle={
                data.items.length > 0
                  ? 'Pick one — then hit Guide me for fork, branch, files & PR help'
                  : data.statusNote ?? 'No matches right now — sync more repos and refresh'
              }
            >
              {data.statusNote && data.items.length > 0 && (
                <p className="border-b border-[var(--color-border)] px-4 py-2 text-xs text-[var(--color-muted)]">
                  {data.statusNote}
                </p>
              )}
              {data.items.length === 0 ? (
                <div className="px-4 py-10 text-center text-sm text-[var(--color-muted)]">
                  <p>
                    {data.statusNote ??
                      'No good-first issues found for your stack yet. Try a full sync on Overview.'}
                  </p>
                  <p className="mt-3">
                    <Link to="/" className="text-[var(--color-accent)] hover:underline">
                      Sync from Overview
                    </Link>
                    {' · '}
                    <button
                      type="button"
                      className="text-[var(--color-accent)] hover:underline"
                      onClick={load}
                      disabled={loading}
                    >
                      Refresh matches
                    </button>
                  </p>
                </div>
              ) : (
                <ul className="divide-y divide-[var(--color-border)]">
                  {data.items.map((issue) => (
                    <li key={issue.id}>
                      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-start lg:gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="badge badge-open">GFI</span>
                            <span className="tabular-nums text-xs font-semibold text-[var(--color-accent)]">
                              {issue.matchScore}% match
                            </span>
                          </div>
                          <a
                            href={issue.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block text-sm font-medium hover:text-[var(--color-accent)]"
                          >
                            {issue.title}
                          </a>
                          <p className="mt-1 text-xs text-[var(--color-muted)]">
                            <Link
                              to={repoPath(issue.repositoryFullName)}
                              className="hover:text-[var(--color-accent)]"
                            >
                              {issue.repositoryFullName}#{issue.number}
                            </Link>
                            {issue.language && (
                              <>
                                {' '}
                                ·{' '}
                                <span className="inline-flex items-center gap-1">
                                  <span
                                    className="inline-block h-1.5 w-1.5 rounded-full"
                                    style={{ background: languageColor(issue.language) }}
                                  />
                                  {issue.language}
                                </span>
                              </>
                            )}
                          </p>
                          <p className="mt-1.5 text-xs leading-relaxed text-[var(--color-text)]">
                            {issue.matchReason}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-stretch gap-2 sm:flex-row lg:flex-col">
                          <button
                            type="button"
                            className="btn btn-primary text-sm"
                            onClick={() => guideMe(issue)}
                          >
                            Guide me
                          </button>
                          <a
                            href={issue.htmlUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-secondary text-center text-sm"
                          >
                            View on GitHub
                          </a>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </>
        )}
      </main>

      <AgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        issue={agentIssue}
        variant="mentorship"
        initialMessage={agentInitialMessage}
        onInitialMessageSent={() => setAgentInitialMessage(null)}
      />
    </>
  );
}
