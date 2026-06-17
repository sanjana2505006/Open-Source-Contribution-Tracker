import type { AgentContext } from '@osct/shared';

type Props = {
  context: AgentContext;
  label?: string;
};

export function AgentContextChip({ context, label }: Props) {
  if (context.type === 'general') return null;

  const text =
    label ??
    (context.owner && context.repo && context.number
      ? `${context.owner}/${context.repo}#${context.number}`
      : 'Focused item');

  return (
    <span className="agent-context-chip">
      {context.type === 'issue' ? 'Issue' : 'PR'} · {text}
    </span>
  );
}
