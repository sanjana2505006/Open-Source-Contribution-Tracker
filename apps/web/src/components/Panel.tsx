import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, subtitle, action, children, className = '' }: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
        <div>
          <h3 className="text-sm font-medium">{title}</h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}
