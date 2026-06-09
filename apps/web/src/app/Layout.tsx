import { NavLink, Outlet } from 'react-router-dom';
import { UserMenu } from '../components/UserMenu';

const links = [
  { to: '/', label: 'Overview', end: true, disabled: false, icon: 'grid' as const },
  { to: '/explore', label: 'Explore', end: false, disabled: false, icon: 'search' as const },
  { to: '/repos', label: 'Repositories', end: false, disabled: true, icon: 'repo' as const },
  { to: '/journey', label: 'Journey', end: false, disabled: true, icon: 'timeline' as const },
];

function NavIcon({ name }: { name: string }) {
  if (name === 'grid') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1 1h6v6H1V1zm0 8h6v6H1V9zm8-8h6v6H9V1zm0 8h6v6H9V9z" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-2.122-2.122a4.5 4.5 0 105.659-5.659 4.5 4.5 0 00-5.66 5.66z" />
      </svg>
    );
  }
  if (name === 'repo') {
    return (
      <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-7a1 1 0 00-1 1v1H4.5a.75.75 0 010-1.5H6V3.25a.5.5 0 01.5-.5h7v9h-7a2.5 2.5 0 01-2.5-2.5V2.5z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M1.5 2.75a.75.75 0 011.5 0v7.5h11.25a.75.75 0 010 1.5H2.75v1.5a.75.75 0 01-1.5 0v-10.5zM4 4.5a.75.75 0 011.5 0v6.5a.75.75 0 01-1.5 0V4.5zm3 2a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0V6.5zm3-1.25a.75.75 0 011.5 0v5.75a.75.75 0 01-1.5 0V5.25z" />
    </svg>
  );
}

export function Layout() {
  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-panel)]/80 backdrop-blur-sm">
        <div className="border-b border-[var(--color-border)] px-4 py-5">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[var(--color-accent-glow)] ring-1 ring-[var(--color-accent)]/30">
              <svg className="h-4 w-4 text-[var(--color-accent)]" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
              </svg>
            </span>
            <div>
              <p className="text-sm font-medium leading-tight">OSCT</p>
              <p className="text-[11px] text-[var(--color-muted)]">Contribution Tracker</p>
            </div>
          </div>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 p-2">
          {links.map((link) =>
            link.disabled ? (
              <span
                key={link.to}
                className="relative flex cursor-not-allowed items-center gap-2.5 rounded-md px-3 py-2 text-sm text-[var(--color-muted)] opacity-40"
              >
                <NavIcon name={link.icon} />
                {link.label}
                <span className="ml-auto font-mono text-[10px]">soon</span>
              </span>
            ) : (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.end}
                className={({ isActive }) =>
                  [
                    'relative flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors',
                    isActive
                      ? 'bg-[var(--color-surface)] text-[var(--color-text)]'
                      : 'text-[var(--color-muted)] hover:bg-[var(--color-surface)]/50 hover:text-[var(--color-text)]',
                  ].join(' ')
                }
              >
                {({ isActive }) => (
                  <>
                    {isActive && <span className="nav-active-indicator" />}
                    <NavIcon name={link.icon} />
                    {link.label}
                  </>
                )}
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
