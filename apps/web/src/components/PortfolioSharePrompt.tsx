import { useState } from 'react';
import { Link } from 'react-router-dom';
import { portfolioPath, sharePortfolioUrl } from '../lib/portfolio';

type Props = {
  username: string;
};

export function PortfolioSharePrompt({ username }: Props) {
  const [linkCopied, setLinkCopied] = useState(false);
  const shareUrl = sharePortfolioUrl(username);

  async function copyShareLink() {
    await navigator.clipboard.writeText(shareUrl);
    setLinkCopied(true);
    window.setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <section className="portfolio-share-prompt">
      <div>
        <p className="portfolio-share-prompt__title">Share with recruiters</p>
        <p className="portfolio-share-prompt__text">
          Your public portfolio — streak, PRs, and activity. Updates when you sync.
        </p>
        <code className="share-progress-card__link">{shareUrl.replace(/^https?:\/\//, '')}</code>
      </div>
      <div className="portfolio-share-prompt__actions">
        <Link to={portfolioPath(username)} className="btn btn-secondary text-sm">
          View portfolio
        </Link>
        <button type="button" onClick={copyShareLink} className="btn btn-primary text-sm">
          {linkCopied ? 'Link copied!' : 'Copy share link'}
        </button>
      </div>
    </section>
  );
}
