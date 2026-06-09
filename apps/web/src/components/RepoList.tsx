import type { RepositorySummary } from '@osct/shared';
import { languageColor } from '../lib/languageColors';

type Props = {
  repos: RepositorySummary[];
};

export function RepoList({ repos }: Props) {
  return (
    <ul className="divide-y divide-[var(--color-border)]">
      {repos.map((repo, i) => (
        <li key={repo.id}>
          <a
            href={repo.htmlUrl}
            target="_blank"
            rel="noreferrer"
            className="group flex items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-[var(--color-panel-hover)]"
            style={{ animationDelay: `${i * 30}ms` }}
          >
            <div className="min-w-0">
              <span className="flex items-center gap-2">
                <span className="truncate font-mono text-sm group-hover:text-[var(--color-accent)]">
                  {repo.fullName}
                </span>
                <svg
                  className="h-3 w-3 shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                  viewBox="0 0 16 16"
                  fill="currentColor"
                  aria-hidden
                >
                  <path d="M3.75 2h3.5a.75.75 0 010 1.5h-2.25v2.25a.75.75 0 01-1.5 0V2.75zm8.5 0a.75.75 0 011.5 0v3.5a.75.75 0 01-1.5 0V3.5h-2.25a.75.75 0 010-1.5h2.25zM2 12.25v-2.25a.75.75 0 011.5 0v2.25h2.25a.75.75 0 010 1.5H2.75a.75.75 0 01-.75-.75zm11.5 0v-2.25a.75.75 0 011.5 0v2.25a.75.75 0 01-.75.75H11.5a.75.75 0 010-1.5h2.25z" />
                </svg>
              </span>
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
            <span className="shrink-0 rounded bg-[var(--color-surface)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-muted)]">
              {repo.contributionCount}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
