import { Link } from 'react-router-dom';
import type { RepositorySummary } from '@osct/shared';
import { languageColor } from '../lib/languageColors';

type Props = {
  repos: RepositorySummary[];
  linkToPrs?: boolean;
};

export function RepoList({ repos, linkToPrs = true }: Props) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {repos.map((repo) => (
        <li key={repo.id}>
          <div className="flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]">
            <div className="min-w-0 flex-1">
              {linkToPrs ? (
                <Link
                  to={`/repos?repo=${encodeURIComponent(repo.fullName)}`}
                  className="truncate font-mono text-sm hover:text-[var(--color-accent)]"
                >
                  {repo.fullName}
                </Link>
              ) : (
                <a
                  href={repo.htmlUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="truncate font-mono text-sm hover:text-[var(--color-accent)]"
                >
                  {repo.fullName}
                </a>
              )}
              {repo.primaryLanguage && (
                <span className="mt-1.5 flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ background: languageColor(repo.primaryLanguage) }}
                  />
                  {repo.primaryLanguage}
                </span>
              )}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {linkToPrs && (
                <Link
                  to={`/repos?repo=${encodeURIComponent(repo.fullName)}`}
                  className="rounded bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[10px] text-[var(--color-muted)] hover:text-[var(--color-accent)]"
                >
                  view PRs
                </Link>
              )}
              <a
                href={repo.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-[10px] text-[var(--color-muted)] hover:text-[var(--color-text)]"
                title="Open on GitHub"
              >
                gh ↗
              </a>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
