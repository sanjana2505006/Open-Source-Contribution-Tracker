import { Link } from 'react-router-dom';
import { LegalSection } from '../components/LegalSection';
import { PageHeader } from '../components/PageHeader';

export function PrivacyPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Privacy Policy"
        description="What OSCT collects, why, and how you stay in control."
      />

      <main className="page-main legal-page">
        <p className="legal-page__intro">
          OSCT (Open Source Contribution Tracker) is run by Sanjana. This page explains what
          happens to your data when you sign in and use the site at{' '}
          <a href="https://osct.onrender.com" target="_blank" rel="noreferrer">
            osct.onrender.com
          </a>
          .
        </p>

        <LegalSection title="What we collect">
          <ul>
            <li>
              <strong>GitHub profile</strong> — username, display name, avatar, bio, profile URL,
              and email if GitHub shares it with us.
            </li>
            <li>
              <strong>Public GitHub activity</strong> — pull requests, issues, repositories, commits,
              and contribution data you choose to sync. We store a copy in our database so the
              dashboard loads quickly.
            </li>
            <li>
              <strong>Session data</strong> — when you sign in, sign out, and last activity while
              browsing (updated about once per minute).
            </li>
            <li>
              <strong>Technical info</strong> — IP address and browser user-agent on login, used for
              session security and basic usage analytics visible to the site admin only.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="What we do not do">
          <ul>
            <li>We do not modify your GitHub repositories, issues, or pull requests.</li>
            <li>We do not sell your personal data.</li>
            <li>We do not share your data with advertisers.</li>
            <li>
              We do not access private repositories unless you grant broader GitHub permissions in
              the future — today we only request read-only profile and email scopes. See our{' '}
              <Link to="/security">Security</Link> page for details.
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Why we collect it">
          <p>
            To show your contribution dashboard, sync data from GitHub, and keep you signed in.
            Session and usage data help the operator understand whether the service is working and
            how people use it.
          </p>
        </LegalSection>

        <LegalSection title="Where data is stored">
          <p>
            Data is stored in a PostgreSQL database (hosted on Neon) and the application runs on
            Render. GitHub OAuth tokens are stored server-side and are never sent to your browser.
          </p>
        </LegalSection>

        <LegalSection title="How long we keep it">
          <p>
            Account and synced contribution data stays until you delete your account or ask us to
            remove it. Sessions expire after a configured period (currently up to 30 days of
            inactivity). You can revoke OSCT&apos;s access to GitHub anytime from your{' '}
            <a
              href="https://github.com/settings/applications"
              target="_blank"
              rel="noreferrer"
            >
              GitHub authorized applications
            </a>{' '}
            settings.
          </p>
        </LegalSection>

        <LegalSection title="Your choices">
          <ul>
            <li>Sign out of OSCT at any time from the header.</li>
            <li>Revoke GitHub access from GitHub settings (linked above).</li>
            <li>
              Request deletion of your account and stored data by contacting the operator (see
              Contact).
            </li>
          </ul>
        </LegalSection>

        <LegalSection title="Contact">
          <p>
            Questions about this policy? Open an issue or reach out via the contact method listed on
            the{' '}
            <a
              href="https://github.com/sanjana2505006/Open-Source-Contribution-Tracker"
              target="_blank"
              rel="noreferrer"
            >
              project repository
            </a>
            .
          </p>
        </LegalSection>

        <p className="legal-page__updated">Last updated: June 2026</p>
      </main>
    </>
  );
}
