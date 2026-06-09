import { NavLink, Outlet } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

const links = [
  { to: '/', label: 'Overview', end: true },
  { to: '/repos', label: 'Repositories', disabled: true },
  { to: '/journey', label: 'Journey', disabled: true },
];

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-52 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)]">
        <div className="border-b border-[var(--color-border)] px-4 py-5">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted)]">
            OSCT
          </p>
          <h1 className="mt-1 text-[15px] font-medium leading-tight">
            Contribution Tracker
          </h1>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {links.map((link) =>
            link.disabled ? (
              <span
                key={link.to}
                className="cursor-not-allowed rounded px-3 py-2 text-sm text-[var(--color-muted)] opacity-50"
              >
                {link.label}
              </span>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [
                    'rounded px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-text)]',
                  ].join(' ')
                }
              >
                {link.label}
              </NavLink>
            ),
          )}
        </nav>

        <UserMenu />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
