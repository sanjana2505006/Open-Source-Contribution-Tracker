import { useState } from 'react';
import { Link } from 'react-router-dom';
import { portfolioPath, portfolioUrl } from '../lib/portfolio';

type Props = {
  username: string;
};

export function PortfolioSharePrompt({ username }: Props) {
  const [copied, setCopied] = useState(false);
  const path = portfolioPath(username);

  async function copyLink() {
    await navigator.clipboard.writeText(portfolioUrl(username));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="portfolio-share-prompt">
      <div>
        <p className="portfolio-share-prompt__title">Your public portfolio</p>
        <p className="portfolio-share-prompt__text">
          Share your open source stats with recruiters — updates when you sync.
        </p>
      </div>
      <div className="portfolio-share-prompt__actions">
        <Link to={path} className="btn btn-secondary text-sm">
          View portfolio
        </Link>
        <button type="button" onClick={copyLink} className="btn btn-primary text-sm">
          {copied ? 'Link copied!' : 'Copy share link'}
        </button>
      </div>
    </div>
  );
}
