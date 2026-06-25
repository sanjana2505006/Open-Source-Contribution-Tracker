import type { DigestPreferences } from '@osct/shared';
import { Panel } from './Panel';
import { PUBLIC_SITE_ORIGIN } from '../lib/portfolio';

const DEFAULT_PREFS: DigestPreferences = {
  emailEnabled: false,
  inAppEnabled: true,
  lastEmailSentAt: null,
  emailAvailable: false,
  emailDeliveryConfigured: false,
};

type Props = {
  prefs: DigestPreferences | null;
  loading: boolean;
  saving: boolean;
  sending: boolean;
  isAdmin?: boolean;
  onToggleEmail: () => void;
  onSendNow: () => void;
};

export function DigestEmailPanel({
  prefs,
  loading,
  saving,
  sending,
  isAdmin,
  onToggleEmail,
  onSendNow,
}: Props) {
  const data = prefs ?? DEFAULT_PREFS;
  const isProduction =
    typeof window !== 'undefined' && window.location.origin === PUBLIC_SITE_ORIGIN;
  const canUseEmail = data.emailAvailable && data.emailDeliveryConfigured;

  return (
    <Panel
      className="mt-6"
      title="Email reminders"
      subtitle="Optional weekly email when stuck issues need attention."
    >
      <div className="digest-prefs">
        {loading && (
          <p className="digest-prefs__note">Loading email preferences…</p>
        )}

        {!loading && !data.emailAvailable && (
          <p className="digest-prefs__note">
            Add a public email on your GitHub profile to enable email digest.
          </p>
        )}

        {!loading && data.emailAvailable && !data.emailDeliveryConfigured && (
          <div className="digest-email-setup-alert">
            <p className="digest-email-setup-alert__title">
              Email sending is not enabled on {isProduction ? 'production' : 'this server'} yet
            </p>
            <p className="digest-prefs__note">
              The digest page works in-app, but weekly email needs a Resend API key on the API
              server. Pushing code to GitHub does <strong>not</strong> copy your local{' '}
              <code>.env</code> file.
            </p>
            {isAdmin && (
              <ol className="digest-setup__steps">
                <li>
                  Get an API key from{' '}
                  <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer">
                    resend.com/api-keys
                  </a>
                </li>
                <li>
                  In{' '}
                  <a href="https://dashboard.render.com" target="_blank" rel="noreferrer">
                    Render → osct → Environment
                  </a>
                  , add <code>RESEND_API_KEY</code> and{' '}
                  <code>DIGEST_FROM_EMAIL</code> (e.g.{' '}
                  <code>OSCT &lt;onboarding@resend.dev&gt;</code> for testing)
                </li>
                <li>Redeploy the service</li>
                <li>
                  Verify:{' '}
                  <a href={`${PUBLIC_SITE_ORIGIN}/api/v1/health`} target="_blank" rel="noreferrer">
                    /api/v1/health
                  </a>{' '}
                  should show <code>&quot;digestEmail&quot;: &quot;configured&quot;</code>
                </li>
              </ol>
            )}
          </div>
        )}

        {!loading && data.emailAvailable && (
          <div className="digest-prefs__actions">
            <label className={`digest-toggle${!canUseEmail ? ' digest-toggle--disabled' : ''}`}>
              <input
                type="checkbox"
                checked={data.emailEnabled}
                disabled={saving || !canUseEmail}
                onChange={() => onToggleEmail()}
              />
              <span>Email me this digest every week</span>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={sending || !canUseEmail}
              onClick={() => onSendNow()}
              title={
                !canUseEmail
                  ? 'Configure RESEND_API_KEY on the server to send email'
                  : undefined
              }
            >
              {sending ? 'Sending…' : 'Send digest now'}
            </button>
          </div>
        )}

        {!loading && data.lastEmailSentAt && (
          <p className="digest-prefs__meta">
            Last email sent {new Date(data.lastEmailSentAt).toLocaleString()}
          </p>
        )}
      </div>
    </Panel>
  );
}

export { DEFAULT_PREFS as DIGEST_DEFAULT_PREFS };
