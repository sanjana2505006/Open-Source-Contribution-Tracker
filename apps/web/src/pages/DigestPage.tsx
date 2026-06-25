import { Link } from 'react-router-dom';
import { useCallback, useEffect, useState } from 'react';
import type { DigestIssueItem, DigestPreferences, WeeklyDigest } from '@osct/shared';
import { useAuth } from '../app/AuthProvider';
import { LoggedOutLanding } from '../components/LoggedOutLanding';
import { PageHeader } from '../components/PageHeader';
import { Panel } from '../components/Panel';
import {
  fetchDigestPreferences,
  fetchWeeklyDigest,
  sendDigestEmail,
  updateDigestPreferences,
} from '../lib/digestApi';

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

function DigestIssueRow({ issue }: { issue: DigestIssueItem }) {
  const label =
    issue.issueNumber != null
      ? `${issue.repositoryFullName}#${issue.issueNumber}`
      : issue.repositoryFullName;

  return (
    <li className="digest-issue">
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
    </li>
  );
}

export function DigestPage() {
  const { user, login } = useAuth();
  const [digest, setDigest] = useState<WeeklyDigest | null>(null);
  const [prefs, setPrefs] = useState<DigestPreferences | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);

    try {
      const [digestData, prefsData] = await Promise.all([
        fetchWeeklyDigest(),
        fetchDigestPreferences(),
      ]);
      setDigest(digestData);
      setPrefs(prefsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load digest');
    } finally {
      setLoading(false);
    }
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
    <main className="page-main">
      <PageHeader
        eyebrow="Weekly"
        title="Stuck-issue digest"
        description="Open issues with no activity for 30+ days, grouped by why they might be stuck."
        actions={
          <Link to="/issues?role=stuck" className="btn btn-secondary">
            Open stuck inbox
          </Link>
        }
      />

      {loading && <p className="mt-6 text-sm text-[var(--color-muted)]">Loading digest…</p>}

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

      {digest && !loading && (
        <>
          <section className="digest-summary animate-fade-up">
            <p className="digest-summary__week">{digest.weekLabel}</p>
            <p className="digest-summary__text">{digest.summary}</p>
            <p className="digest-summary__meta">
              Generated {new Date(digest.generatedAt).toLocaleString()}
            </p>
          </section>

          {prefs && (
            <Panel
              className="mt-6"
              title="Email reminders"
              subtitle="Optional weekly email when stuck issues need attention."
            >
              <div className="digest-prefs">
                {!prefs.emailAvailable && (
                  <p className="digest-prefs__note">
                    Add a public email on your GitHub profile to enable email digest.
                  </p>
                )}
                {prefs.emailAvailable && !prefs.emailDeliveryConfigured && (
                  <>
                    <p className="digest-prefs__note">
                      Email delivery is not configured on this server yet. In-app digest still works.
                    </p>
                    {user.isAdmin && (
                      <div className="digest-setup">
                        <p className="digest-setup__title">Deployer setup (Resend)</p>
                        <ol className="digest-setup__steps">
                          <li>
                            Create an API key at{' '}
                            <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer">
                              resend.com/api-keys
                            </a>
                          </li>
                          <li>
                            Set <code>RESEND_API_KEY</code> and{' '}
                            <code>DIGEST_FROM_EMAIL</code> on the API server (local <code>.env</code>{' '}
                            or Render → Environment)
                          </li>
                          <li>
                            For quick testing use{' '}
                            <code>OSCT &lt;onboarding@resend.dev&gt;</code> — Resend only delivers to
                            your Resend signup email until you verify a domain
                          </li>
                          <li>Restart the API after saving env vars</li>
                        </ol>
                      </div>
                    )}
                  </>
                )}
                {prefs.emailAvailable && prefs.emailDeliveryConfigured && (
                  <div className="digest-prefs__actions">
                    <label className="digest-toggle">
                      <input
                        type="checkbox"
                        checked={prefs.emailEnabled}
                        disabled={saving}
                        onChange={() => toggleEmail()}
                      />
                      <span>Email me this digest every week</span>
                    </label>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      disabled={sending}
                      onClick={() => handleSendNow()}
                    >
                      {sending ? 'Sending…' : 'Send digest now'}
                    </button>
                  </div>
                )}
                {prefs.lastEmailSentAt && (
                  <p className="digest-prefs__meta">
                    Last email sent {new Date(prefs.lastEmailSentAt).toLocaleString()}
                  </p>
                )}
              </div>
            </Panel>
          )}

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
                      <DigestIssueRow key={issue.id} issue={issue} />
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
                      <DigestIssueRow key={issue.id} issue={issue} />
                    ))}
                  </ul>
                </Panel>
              ))}
            </>
          )}
        </>
      )}
    </main>
  );
}
