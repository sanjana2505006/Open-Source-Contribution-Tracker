import { Link } from 'react-router-dom';

const LINKEDIN_URL = 'https://www.linkedin.com/in/sanjana250506/';

function LinkedInIcon() {
  return (
    <svg className="app-footer__icon" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
    </svg>
  );
}

export function AppFooter() {
  return (
    <footer className="app-footer">
      <nav className="app-footer__links" aria-label="Footer">
        <a
          href={LINKEDIN_URL}
          className="app-footer__link app-footer__link--linkedin"
          target="_blank"
          rel="noopener noreferrer"
        >
          <LinkedInIcon />
          LinkedIn
        </a>
        <Link to="/privacy" className="app-footer__link">
          Privacy
        </Link>
        <Link to="/security" className="app-footer__link">
          Security
        </Link>
        <Link to="/feedback" className="app-footer__link">
          Feedback
        </Link>
      </nav>
    </footer>
  );
}
