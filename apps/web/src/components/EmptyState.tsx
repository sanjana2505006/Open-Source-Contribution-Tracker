import type { ReactNode } from 'react';
import { PullRequestIcon } from './icons/PullRequestIcon';

type Props = {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: 'inbox' | 'search' | 'timeline' | 'github';
};

function EmptyIcon({ name }: { name: NonNullable<Props['icon']> }) {
  const className = 'h-6 w-6 text-[var(--color-muted)]';
  if (name === 'github') {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" />
      </svg>
    );
  }
  if (name === 'search') {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M10.68 11.74a6 6 0 01-7.922-8.982 6 6 0 018.982 7.922l3.04 3.04a.749.749 0 11-1.06 1.06l-3.04-3.04zm-2.122-2.122a4.5 4.5 0 105.659-5.659 4.5 4.5 0 00-5.66 5.66z" />
      </svg>
    );
  }
  if (name === 'timeline') {
    return (
      <svg className={className} viewBox="0 0 16 16" fill="currentColor" aria-hidden>
        <path d="M1.5 2.75a.75.75 0 011.5 0v7.5h11.25a.75.75 0 010 1.5H2.75v1.5a.75.75 0 01-1.5 0v-10.5zM4 4.5a.75.75 0 011.5 0v6.5a.75.75 0 01-1.5 0V4.5zm3 2a.75.75 0 011.5 0v4.5a.75.75 0 01-1.5 0V6.5zm3-1.25a.75.75 0 011.5 0v5.75a.75.75 0 01-1.5 0V5.25z" />
      </svg>
    );
  }
  return <PullRequestIcon className={className} />;
}

export function EmptyState({ title, description, action, icon = 'inbox' }: Props) {
  return (
    <div className="panel animate-fade-up border-dashed px-6 py-14 text-center">
      <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--color-surface)] ring-1 ring-[var(--color-border)]">
        <EmptyIcon name={icon} />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-[var(--color-muted)]">
        {description}
      </p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
