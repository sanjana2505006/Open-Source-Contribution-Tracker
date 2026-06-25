import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { DigestIssueItem, DigestPreferences, IssueItem, WeeklyDigest } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { AgentPanel } from '../components/agent/AgentPanel';
import { DIGEST_DEFAULT_PREFS, DigestEmailPanel } from '../components/DigestEmailPanel';
import { IssueTable } from '../components/IssueTable';
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

function toIssueItem(issue: DigestIssueItem): IssueItem {
  return digestIssueToAgentItem(issue);
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
    setAgentIssue(issue ? toIssueItem(issue) : null);
    setAgentOpen(true);
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setDigestLoading(true);
    setPrefsLoading(true);
    setError(null);

    const digestPromise = fetchWeeklyDigest()
      .then(setDigest)
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
      setPrefs(await fetchDigestPreferences());
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
        description="Issues with no activity for 30+ days — prioritized and grouped."
        actions={
          <>
            {digest && digest.stuckTotal > 0 && (
              <button type="button" onClick={() => openAgent()} className="btn btn-secondary">
                Digest assistant
              </button>
            )}
            <Link to="/issues?role=stuck" className="btn btn-secondary">
              Stuck inbox
            </Link>
          </>
        }
      />

      <main className="page-main digest-page">
        {digestLoading && (
          <p className="text-sm text-[var(--color-muted)]">Loading digest…</p>
        )}

        {error && <p className="alert alert-error">{error}</p>}
        {message && <p className="alert alert-success">{message}</p>}

        {digest && !digestLoading && (
          <section className="digest-hero animate-fade-up">
            <div className="digest-hero__stat">
              <span className="digest-hero__value">{digest.stuckTotal}</span>
              <span className="digest-hero__label">stuck</span>
            </div>
            <div className="digest-hero__copy">
              <p className="digest-hero__week">{digest.weekLabel}</p>
              <p className="digest-hero__summary">{digest.summary}</p>
            </div>
          </section>
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
            {digest.stuckTotal === 0 ? (
              <Panel className="mt-6" title="All clear">
                <p className="text-sm text-[var(--color-muted)]">
                  No stuck issues right now. They appear here after sync when open issues go 30+
                  days without activity.
                </p>
              </Panel>
            ) : (
              <>
                {digest.topPriorities.length > 0 && (
                  <Panel
                    className="mt-6"
                    flush
                    title="Top priorities"
                    subtitle="Tackle these first"
                  >
                    <IssueTable
                      issues={digest.topPriorities.map(toIssueItem)}
                      variant="stuck"
                      showRepository
                      onAskAgent={(issue) => openAgent(digest.topPriorities.find((i) => i.id === issue.id))}
                    />
                  </Panel>
                )}

                {digest.groups.length > 0 && (
                  <Panel
                    className="mt-6"
                    flush
                    title="By reason"
                    subtitle={`${digest.groups.length} group${digest.groups.length === 1 ? '' : 's'}`}
                  >
                    {digest.groups.map((group, index) => (
                      <div key={group.reason} className="digest-group">
                        <div className="digest-group__header">
                          <h4 className="digest-group__title">{group.reason}</h4>
                          <span className="digest-group__count">{group.count}</span>
                        </div>
                        <IssueTable
                          issues={group.issues.map(toIssueItem)}
                          variant="stuck"
                          showRepository
                          onAskAgent={(issue) =>
                            openAgent(group.issues.find((i) => i.id === issue.id))
                          }
                        />
                        {index < digest.groups.length - 1 && (
                          <div className="digest-group__divider" />
                        )}
                      </div>
                    ))}
                  </Panel>
                )}
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
