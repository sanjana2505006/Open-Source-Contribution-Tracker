import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { DigestIssueItem, DigestPreferences, IssueItem, WeeklyDigest } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AgentPanel } from '../components/agent/AgentPanel';
import { DIGEST_DEFAULT_PREFS, DigestEmailPanel } from '../components/DigestEmailPanel';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import { digestIssueToAgentItem } from '../lib/agentContext';
import {
  fetchDigestPreferences,
  fetchWeeklyDigest,
  sendDigestEmail,
  updateDigestPreferences,
} from '../lib/digestApi';

const DIGEST_GENERAL_STARTERS = [
  'Summarize my stuck issues and what I should tackle first this week.',
  'Which issues most need a follow-up comment on GitHub?',
  'Help me prioritize these stuck issues by impact.',
];

const DIGEST_ISSUE_STARTERS = [
  'Summarize this issue and why it might be stuck.',
  'What should I do next on this issue?',
  'Draft a polite follow-up comment and prepare it for posting.',
  'What GitHub comment would help unblock this?',
];

function roleLabel(role: string): string {
  switch (role) {
    case 'assigned':
      return 'Assigned';
    case 'commented':
      return 'Commented';
    case 'authored':
      return 'Opened';
    default:
      return role;
  }
}

function DigestIssueRow({
  issue,
  onAskAgent,
}: {
  issue: DigestIssueItem;
  onAskAgent?: (issue: DigestIssueItem) => void;
}) {
  const label =
    issue.issueNumber != null
      ? `${issue.repositoryFullName}#${issue.issueNumber}`
      : issue.repositoryFullName;

  return (
    <li className="digest-issue">
      <div className="digest-issue__row group">
        <div className="digest-issue__main">
          <a href={issue.htmlUrl} target="_blank" rel="noreferrer" className="digest-issue__title">
            <span className="digest-issue__repo">{label}</span>
            <span className="digest-issue__sep"> — </span>
            {issue.title}
          </a>
          <p className="digest-issue__meta">
            <span className="badge badge-stale">{issue.stuckDays}d stuck</span>
            <span>{issue.stuckReason}</span>
            {issue.roles.map((role) => (
              <span key={role} className="badge badge-open">
                {roleLabel(role)}
              </span>
            ))}
          </p>
        </div>
        {onAskAgent && (
          <button
            type="button"
            className="agent-issue-btn"
            onClick={() => onAskAgent(issue)}
            title="Ask OSCT agent about this stuck issue"
          >
            Ask agent
          </button>
        )}
      </div>
    </li>
  );
}

export function DigestPage() {
  const { user, login } = useAuth();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [prefs, setPrefs] = useState<DigestPreferences | null>(null);
  const [digestLoading, setDigestLoading] = useState(true);
  const [prefsLoading, setPrefsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentOpen, setAgentOpen] = useState(false);
  const [agentIssue, setAgentIssue] = useState<IssueItem | null>(null);

  const openAgent = useCallback((issue?: DigestIssueItem) => {
    setAgentIssue(issue ? digestIssueToAgentItem(issue) : null);
    setAgentOpen(true);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setDigestLoading(true);
    setPrefsLoading(true);
    setError(null);

    const digestPromise = fetchWeeklyDigest()
      .then((digestData) => {
        setDigest(digestData);
      })
      .catch((err) => {
        setDigest(null);
        setError(err instanceof Error ? err.message : 'Failed to load digest');
      })
      .finally(() => setDigestLoading(false));

    const prefsPromise = fetchDigestPreferences()
      .then(setPrefs)
      .catch(() => setPrefs(DIGEST_DEFAULT_PREFS))
      .finally(() => setPrefsLoading(false));

    await Promise.all([digestPromise, prefsPromise]);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  const toggleEmail = async () => {
    if (!prefs) return;
    setSaving(true);
    setMessage(null);
    setError(null);

    try {
      const next = await updateDigestPreferences({ emailEnabled: !prefs.emailEnabled });
      setPrefs(next);
      setMessage(next.emailEnabled ? 'Weekly email digest enabled.' : 'Weekly email digest disabled.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update preferences');
    } finally {
      setSaving(false);
    }
  };

  const handleSendNow = async () => {
    setSending(true);
    setMessage(null);
    setError(null);

    try {
      const result = await sendDigestEmail();
      setMessage(result.message);
      const nextPrefs = await fetchDigestPreferences();
      setPrefs(nextPrefs);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send email');
    } finally {
      setSending(false);
    }
  };

  if (!user) {
    return (
      <LoggedOutLanding
        title="Weekly digest"
        description="Sign in to see stuck issues grouped by why they stalled, plus optional email reminders."
        onLogin={login}
      />
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Weekly"
        title="Stuck-issue digest"
        description="Open issues with no activity for 30+ days, grouped by why they might be stuck."
        actions={
          <>
            {digest && digest.stuckTotal > 0 && (
              <button
                type="button"
                onClick={() => openAgent()}
                className="btn btn-secondary"
              >
                Digest assistant
              </button>
            )}
            <Link to="/issues?role=stuck" className="btn btn-secondary">
              Open stuck inbox
            </Link>
          </>
        }
      />

      <main className="page-main">

      {(digestLoading || prefsLoading) && (
        <p className="mt-6 text-sm text-[var(--color-muted)]">Loading digest…</p>
      )}

      {error && (
        <p className="mt-6 rounded-lg border border-[var(--color-danger)]/30 bg-[var(--color-danger)]/10 px-4 py-3 text-sm text-[var(--color-danger)]">
          {error}
        </p>
      )}

      {message && (
        <p className="mt-6 rounded-lg border border-[var(--color-ok)]/30 bg-[var(--color-ok)]/10 px-4 py-3 text-sm text-[var(--color-ok)]">
          {message}
        </p>
      )}

      <DigestEmailPanel
        prefs={prefs}
        loading={prefsLoading}
        saving={saving}
        sending={sending}
        isAdmin={user.isAdmin}
        onToggleEmail={toggleEmail}
        onSendNow={handleSendNow}
      />

      {digest && !digestLoading && (
        <>
          <section className="digest-summary animate-fade-up">
            <p className="digest-summary__week">{digest.weekLabel}</p>
            <p className="digest-summary__text">{digest.summary}</p>
            <p className="digest-summary__meta">
              Generated {new Date(digest.generatedAt).toLocaleString()}
            </p>
          </section>

          {digest.stuckTotal === 0 ? (
            <Panel className="mt-6" title="All clear">
              <p className="text-sm text-[var(--color-muted)]">
                No stuck issues right now. Issues with 30+ days of inactivity will show up here after
                sync.
              </p>
            </Panel>
          ) : (
            <>
              {digest.topPriorities.length > 0 && (
                <Panel
                  className="mt-6"
                  flush
                  title="Top priorities"
                  subtitle="Oldest stuck issues to tackle first"
                >
                  <ul className="digest-issue-list">
                    {digest.topPriorities.map((issue) => (
                      <DigestIssueRow key={issue.id} issue={issue} onAskAgent={openAgent} />
                    ))}
                  </ul>
                </Panel>
              )}

              {digest.groups.map((group) => (
                <Panel
                  key={group.reason}
                  className="mt-6"
                  flush
                  title={group.reason}
                  subtitle={`${group.count} issue${group.count === 1 ? '' : 's'}`}
                >
                  <ul className="digest-issue-list">
                    {group.issues.map((issue) => (
                      <DigestIssueRow key={issue.id} issue={issue} onAskAgent={openAgent} />
                    ))}
                  </ul>
                </Panel>
              ))}
            </>
          )}
        </>
      )}
      </main>

      <AgentPanel
        open={agentOpen}
        onClose={() => setAgentOpen(false)}
        issue={agentIssue}
        starters={agentIssue ? DIGEST_ISSUE_STARTERS : DIGEST_GENERAL_STARTERS}
        panelTitle={agentIssue ? 'Stuck issue assistant' : 'Digest assistant'}
        panelSubtitle={
          agentIssue
            ? 'Summarize the thread, get next steps, and post an approved follow-up to GitHub.'
            : 'Plan your week, prioritize stuck work, and draft follow-ups for GitHub.'
        }
      />
    </>
  );
}
