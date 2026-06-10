import { useAuth } from '../app/AuthProvider';

function GitHubIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
    </svg>
  );
}

export function UserMenu() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="border-t border-[var(--color-border)] p-3">
        <div className="skeleton h-11 w-full rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="border-t border-[var(--color-border)] p-3">
        <button type="button" onClick={login} className="btn btn-secondary w-full">
          <GitHubIcon />
          Sign in with GitHub
        </button>
      </div>
    );
  }

  return (
    <div className="border-t border-[var(--color-border)] p-3">
      <div className="flex items-center gap-2.5 rounded-lg bg-[var(--color-surface)]/80 px-2.5 py-2 ring-1 ring-[var(--color-border)]">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-9 w-9 rounded-full ring-2 ring-[var(--color-accent)]/20"
          />
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-panel)] font-mono text-sm">
            {user.username[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{user.displayName ?? user.username}</p>
          <p className="truncate font-mono text-[11px] text-[var(--color-muted)]">
            @{user.username}
          </p>
        </div>
      </div>
      <button type="button" onClick={() => logout()} className="btn btn-ghost mt-1.5 w-full px-2 py-1.5 text-xs">
        Sign out
      </button>
    </div>
  );
}
