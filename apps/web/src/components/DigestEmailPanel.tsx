import { useState } from 'react';
import type { DigestPreferences } from '@osct/shared';
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

function MailIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M1.75 2h12.5c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0114.25 14H1.75A1.75 1.75 0 010 12.25v-8.5C0 2.784.784 2 1.75 2zM1.75 3.5a.25.25 0 00-.25.25v.638l6.455 4.033a.75.75 0 00.79 0L14.5 4.388V3.75a.25.25 0 00-.25-.25H1.75zm12.75 2.508l-5.846 3.653a2.25 2.25 0 01-2.326 0L1.5 6.008v6.242c0 .138.112.25.25.25h12.5a.25.25 0 00.25-.25V6.008z" />
    </svg>
  );
}

export function DigestEmailPanel({
  prefs,
  loading,
  saving,
  sending,
  isAdmin,
  onToggleEmail,
  onSendNow,
}: Props) {
  const [setupOpen, setSetupOpen] = useState(false);
  const data = prefs ?? DEFAULT_PREFS;
  const isProduction =
    typeof window !== 'undefined' && window.location.origin === PUBLIC_SITE_ORIGIN;
  const canUseEmail = data.emailAvailable && data.emailDeliveryConfigured;

  if (loading) {
    return (
      <section className="digest-email-bar digest-email-bar--loading">
        <div className="skeleton h-10 w-full rounded-lg" />
      </section>
    );
  }

  return (
    <section className="digest-email-bar">
      <div className="digest-email-bar__main">
        <div className="digest-email-bar__lead">
          <span className="digest-email-bar__icon" aria-hidden>
            <MailIcon />
          </span>
          <div>
            <p className="digest-email-bar__title">Email reminders</p>
            <p className="digest-email-bar__hint">
              {!data.emailAvailable
                ? 'Add a public email on GitHub to enable'
                : canUseEmail
                  ? data.emailEnabled
                    ? 'Weekly digest enabled'
                    : 'Optional weekly digest to your inbox'
                  : 'Server email not configured yet'}
            </p>
          </div>
        </div>

        {data.emailAvailable && (
          <div className="digest-email-bar__controls">
            <label
              className={`digest-email-bar__toggle${!canUseEmail ? ' digest-email-bar__toggle--off' : ''}`}
            >
              <input
                type="checkbox"
                checked={data.emailEnabled}
                disabled={saving || !canUseEmail}
                onChange={() => onToggleEmail()}
              />
              <span>Weekly</span>
            </label>
            <button
              type="button"
              className="btn btn-secondary"
              disabled={sending || !canUseEmail}
              onClick={() => onSendNow()}
            >
              {sending ? 'Sending…' : 'Send now'}
            </button>
          </div>
        )}
      </div>

      {data.lastEmailSentAt && (
        <p className="digest-email-bar__sent">
          Last sent {new Date(data.lastEmailSentAt).toLocaleString()}
        </p>
      )}

      {data.emailAvailable && !data.emailDeliveryConfigured && isAdmin && (
        <details
          className="digest-email-bar__setup"
          open={setupOpen}
          onToggle={(e) => setSetupOpen((e.target as HTMLDetailsElement).open)}
        >
          <summary>Enable email on {isProduction ? 'Render' : 'server'}</summary>
          <ol>
            <li>
              API key from{' '}
              <a href="https://resend.com/api-keys" target="_blank" rel="noreferrer">
                resend.com
              </a>
            </li>
            <li>
              Add <code>RESEND_API_KEY</code> + <code>DIGEST_FROM_EMAIL</code> in{' '}
              <a href="https://dashboard.render.com" target="_blank" rel="noreferrer">
                Render Environment
              </a>
            </li>
            <li>Redeploy — check health shows <code>digestEmail: configured</code></li>
          </ol>
        </details>
      )}
    </section>
  );
}

export { DEFAULT_PREFS as DIGEST_DEFAULT_PREFS };
