import { NavLink } from 'react-router-dom';
import { useAuth } from '../app/AuthProvider';
import { ThemeToggle } from './ThemeToggle';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/explore', label: 'Explore', end: false },
  { to: '/repos', label: 'My PRs', end: false },
  { to: '/issues', label: 'My Issues', end: false },
  { to: '/journey', label: 'Journey', end: false },
];

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function AppHeader() {
  const { user, loading, login, logout } = useAuth();

  return (
    <header className="app-header">
      <NavLink to="/" className="app-header__brand">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[var(--color-accent-glow)] ring-1 ring-[var(--color-accent)]/25">
          <GitHubIcon />
        </span>
        <span className="hidden sm:inline">
          <span className="block text-sm font-semibold leading-tight tracking-tight">OSCT</span>
          <span className="block text-[10px] text-[var(--color-muted)]">Contribution Tracker</span>
        </span>
      </NavLink>

      {user && (
        <nav className="app-header__nav" aria-label="Main">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                ['app-header__link', isActive && 'app-header__link--active'].filter(Boolean).join(' ')
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      )}

      <div className="app-header__actions">
        <div className="app-header__theme">
          <ThemeToggle />
        </div>

        {loading ? (
          <div className="skeleton h-9 w-24 rounded-lg" />
        ) : user ? (
          <div className="app-header__user">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="app-header__avatar" />
            ) : (
              <span className="app-header__avatar app-header__avatar--fallback">
                {user.username[0]?.toUpperCase()}
              </span>
            )}
            <span className="app-header__username hidden md:inline">@{user.username}</span>
            <button type="button" onClick={() => logout()} className="app-header__signout">
              Sign out
            </button>
          </div>
        ) : (
          <button type="button" onClick={login} className="btn btn-primary app-header__signin">
            <GitHubIcon />
            Sign in
          </button>
        )}
      </div>
    </header>
  );
}
