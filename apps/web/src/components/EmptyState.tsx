type Props = {
  title: string;
  description: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, description, action }: Props) {
  return (
    <div className="panel animate-fade-up border-dashed px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-sm text-[var(--color-muted)]">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
