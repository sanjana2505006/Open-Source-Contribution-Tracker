import { Link } from 'react-router-dom';

export function AppFooter() {
  return (
    <footer className="app-footer">
      <p className="app-footer__text">
        Made with <span className="app-footer__heart" aria-label="love">♥</span> by{' '}
        <a
          href="https://www.linkedin.com/in/sanjana250506/"
          className="app-footer__link"
          target="_blank"
          rel="noopener noreferrer"
        >
          Sanjana
        </a>
      </p>
      <nav className="app-footer__links" aria-label="Legal">
        <Link to="/privacy" className="app-footer__link">
          Privacy
        </Link>
        <span className="app-footer__sep" aria-hidden>
          ·
        </span>
        <Link to="/security" className="app-footer__link">
          Security
        </Link>
        <span className="app-footer__sep" aria-hidden>
          ·
        </span>
        <Link to="/feedback" className="app-footer__link">
          Feedback
        </Link>
      </nav>
    </footer>
  );
}
