import { useState } from 'react';
import type { ContributorProfile } from '@osct/shared';
import { sharePortfolioUrl } from '../lib/portfolio';

type Props = {
  profile: ContributorProfile;
};

export function SharePortfolioBar({ profile }: Props) {
  const [copied, setCopied] = useState(false);
  const url = sharePortfolioUrl(profile.username);

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="share-portfolio">
      <div className="share-portfolio__url">
        <span className="share-portfolio__label">Public link</span>
        <code className="share-portfolio__path">{url.replace(/^https?:\/\//, '')}</code>
      </div>

      <div className="share-portfolio__actions">
        <button type="button" onClick={copyLink} className="btn btn-secondary text-sm">
          {copied ? 'Copied!' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
