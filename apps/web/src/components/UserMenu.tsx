import { useAuth } from '../app/AuthProvider';

export function UserMenu() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <p className="px-3 py-2 font-mono text-xs text-[var(--color-muted)]">…</p>
    );
  }

  if (!user) {
    return (
      <button
        type="button"
        onClick={login}
        className="mx-2 w-[calc(100%-1rem)] rounded border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-left text-sm hover:border-[var(--color-accent-dim)]"
      >
        Sign in with GitHub
      </button>
    );
  }

  return (
    <div className="border-t border-[var(--color-border)] p-2">
      <div className="flex items-center gap-2 rounded px-2 py-2">
        {user.avatarUrl ? (
          <img
            src={user.avatarUrl}
            alt=""
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--color-surface)] font-mono text-xs">
            {user.username[0]?.toUpperCase()}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm">{user.displayName ?? user.username}</p>
          <p className="truncate font-mono text-[11px] text-[var(--color-muted)]">
            @{user.username}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={() => logout()}
        className="mt-1 w-full rounded px-3 py-1.5 text-left text-xs text-[var(--color-muted)] hover:text-[var(--color-text)]"
      >
        Sign out
      </button>
    </div>
  );
}
