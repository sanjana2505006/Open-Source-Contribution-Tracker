import { Link } from 'react-router-dom';
import { GitHubAuthNote } from '../components/GitHubAuthNote';
import { LegalSection } from '../components/LegalSection';
import { PageHeader } from '../components/PageHeader';

export function SecurityPage() {
  return (
    <>
      <PageHeader
        eyebrow="Legal"
        title="Security & Permissions"
        description="How OSCT connects to GitHub and what access it actually uses."
      />

      <main className="page-main legal-page">
        <p className="legal-page__intro">
          OSCT is a read-only dashboard. It pulls your public GitHub contribution data so you can
          see PRs, issues, repos, and analytics in one place. It never pushes changes back to
          GitHub.
        </p>

        <div className="legal-page__callout">
          <GitHubAuthNote />
        </div>

        <LegalSection title="GitHub permissions we request">
          <p>When you click &ldquo;Sign in with GitHub,&rdquo; we ask for exactly two scopes:</p>
          <ul>
            <li>
              <strong>read:user</strong> — read your public profile (username, name, avatar, etc.).
            </li>
            <li>
              <strong>user:email</strong> — read your email addresses (read-only), if GitHub provides
              them.
            </li>
          </ul>
          <p>
            We intentionally do <strong>not</strong> request <code>public_repo</code> or{' '}
            <code>repo</code>, so GitHub&apos;s authorization screen should not ask for write access
            to your repositories.
          </p>
        </LegalSection>

        <LegalSection title="How we use your GitHub token">
          <ul>
            <li>Stored encrypted server-side in our database — never exposed to the browser.</li>
            <li>Used only to call GitHub&apos;s API and GraphQL to read public contribution data.</li>
            <li>Used when you click &ldquo;Sync from GitHub&rdquo; or load features that need fresh data.</li>
            <li>Discarded when you sign out (session ended) or when you revoke access on GitHub.</li>
          </ul>
        </LegalSection>

        <LegalSection title="What we never do with your token">
          <ul>
            <li>Create, edit, or close issues or pull requests.</li>
            <li>Push code or commit on your behalf.</li>
            <li>Change repository settings, webhooks, or collaborators.</li>
            <li>Star, fork, or delete repositories.</li>
          </ul>
          <p>
            You can verify this yourself — the app is open source. Search the codebase for GitHub
            API calls; they are read operations only.
          </p>
        </LegalSection>

        <LegalSection title="Sessions & cookies">
          <ul>
            <li>
              A signed session cookie keeps you logged in. It is HTTP-only and scoped to this site.
            </li>
            <li>
              OAuth state cookies are used briefly during sign-in to prevent CSRF attacks, then
              cleared.
            </li>
            <li>Production runs over HTTPS on Render.</li>
          </ul>
        </LegalSection>

        <LegalSection title="Admin access">
          <p>
            The site operator can view aggregate usage (sign-ups, logins, time on site) in an admin
            dashboard. That access is limited to configured admin GitHub usernames and is not visible
            to regular users. See the <Link to="/privacy">Privacy Policy</Link> for what is logged.
          </p>
        </LegalSection>

        <LegalSection title="If something looks wrong">
          <ol>
            <li>
              Revoke OSCT from{' '}
              <a
                href="https://github.com/settings/applications"
                target="_blank"
                rel="noreferrer"
              >
                GitHub → Settings → Applications
              </a>
              .
            </li>
            <li>Sign out of OSCT.</li>
            <li>Report the issue via the project repository.</li>
          </ol>
        </LegalSection>

        <p className="legal-page__updated">Last updated: June 2026</p>
      </main>
    </>
  );
}
