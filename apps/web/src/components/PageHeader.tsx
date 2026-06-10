import type { ReactNode } from 'react';

type Props = {
  eyebrow?: string;
  title: ReactNode;
  description?: string;
  actions?: ReactNode;
  children?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, actions, children }: Props) {
  return (
    <header className="page-header animate-fade-up">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && (
            <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--color-muted)]">
              {eyebrow}
            </p>
          )}
          <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{title}</h2>
          {description && (
            <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-[var(--color-muted)]">
              {description}
            </p>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-col items-end gap-3">{actions}</div>}
      </div>
      {children}
    </header>
  );
}
