import { useState } from 'react';
import type { ContributorProfile } from '@osct/shared';
import { buildPortfolioSummary, portfolioUrl } from '../lib/portfolio';

type Props = {
  profile: ContributorProfile;
  isOwner?: boolean;
};

function shareLinkedIn(url: string, title: string) {
  const shareUrl = new URL('https://www.linkedin.com/sharing/share-offsite/');
  shareUrl.searchParams.set('url', url);
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer,width=600,height=600');
  void title;
}

function shareX(url: string, text: string) {
  const shareUrl = new URL('https://twitter.com/intent/tweet');
  shareUrl.searchParams.set('url', url);
  shareUrl.searchParams.set('text', text);
  window.open(shareUrl.toString(), '_blank', 'noopener,noreferrer,width=600,height=420');
}

export function SharePortfolioBar({ profile, isOwner }: Props) {
  const [copied, setCopied] = useState<'link' | 'summary' | null>(null);
  const url = portfolioUrl(profile.username);
  const displayName = profile.displayName ?? profile.username;

  async function copyLink() {
    await navigator.clipboard.writeText(url);
    setCopied('link');
    window.setTimeout(() => setCopied(null), 2000);
  }

  async function copySummary() {
    await navigator.clipboard.writeText(buildPortfolioSummary(profile));
    setCopied('summary');
    window.setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="share-portfolio">
      <div className="share-portfolio__url">
        <span className="share-portfolio__label">Public link</span>
        <code className="share-portfolio__path">{url.replace(/^https?:\/\/[^/]+/, '')}</code>
      </div>

      <div className="share-portfolio__actions">
        <button type="button" onClick={copyLink} className="btn btn-secondary text-sm">
          {copied === 'link' ? 'Copied!' : 'Copy link'}
        </button>
        <button type="button" onClick={copySummary} className="btn btn-secondary text-sm">
          {copied === 'summary' ? 'Copied!' : 'Copy summary'}
        </button>
        <button
          type="button"
          onClick={() =>
            shareLinkedIn(url, `${displayName}'s open source portfolio on OSCT`)
          }
          className="btn btn-ghost text-sm"
        >
          LinkedIn
        </button>
        <button
          type="button"
          onClick={() =>
            shareX(
              url,
              `${displayName}'s open source portfolio — ${profile.stats.pullRequests} PRs across ${profile.stats.repositories} repos`,
            )
          }
          className="btn btn-ghost text-sm"
        >
          Post
        </button>
      </div>

      {isOwner && (
        <p className="share-portfolio__hint">
          This page updates when you sync. Share it on your resume or LinkedIn.
        </p>
      )}
    </div>
  );
}
