import type { ReactNode } from 'react';

type PanelProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  flush?: boolean;
};

export function Panel({
  title,
  subtitle,
  action,
  children,
  className = '',
  flush = false,
}: PanelProps) {
  return (
    <div className={`panel ${className}`}>
      <div className="panel-header">
        <div>
          <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
          {subtitle && (
            <p className="mt-1 text-sm text-[var(--color-muted)]">{subtitle}</p>
          )}
        </div>
        {action}
      </div>
      <div className={flush ? 'panel-body-flush' : 'panel-body'}>{children}</div>
    </div>
  );
}
