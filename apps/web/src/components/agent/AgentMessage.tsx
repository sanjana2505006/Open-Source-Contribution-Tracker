type Props = {
  role: 'user' | 'assistant';
  content: string;
};

export function AgentMessage({ role, content }: Props) {
  return (
    <div className={`agent-message agent-message--${role}`}>
      <p className="agent-message__label">{role === 'user' ? 'You' : 'OSCT Agent'}</p>
      <div className="agent-message__body">{content}</div>
    </div>
  );
}
