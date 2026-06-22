import { useState } from 'react';
import type { AgentContext } from '@osct/shared';
import { copyToClipboard, extractSuggestedComments, parseMessageBlocks } from '../../lib/agentMessageUtils';

type Props = {
  role: 'user' | 'assistant';
  content: string;
  issueContext?: AgentContext | null;
  canPropose?: boolean;
  onPrepareComment?: (body: string) => Promise<void>;
};

export function AgentMessage({
  role,
  content,
  issueContext,
  canPropose = false,
  onPrepareComment,
}: Props) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [preparing, setPreparing] = useState(false);

  const blocks = role === 'assistant' ? parseMessageBlocks(content) : null;
  const suggestedComments = role === 'assistant' ? extractSuggestedComments(content) : [];
  const showPrepare =
    canPropose &&
    role === 'assistant' &&
    issueContext?.type === 'issue' &&
    suggestedComments.length > 0 &&
    onPrepareComment;

  async function handleCopy(key: string, text: string) {
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      window.setTimeout(() => setCopiedKey(null), 2000);
    }
  }

  async function handlePrepare() {
    const draft = suggestedComments[0];
    if (!draft || !onPrepareComment) return;
    setPreparing(true);
    try {
      await onPrepareComment(draft);
    } finally {
      setPreparing(false);
    }
  }

  return (
    <div className={`agent-message agent-message--${role}`}>
      <p className="agent-message__label">{role === 'user' ? 'You' : 'OSCT Agent'}</p>

      {role === 'user' || !blocks ? (
        <div className="agent-message__body">{content}</div>
      ) : (
        <div className="agent-message__body agent-message__body--rich">
          {blocks.map((block, index) =>
            block.type === 'text' ? (
              <p key={`text-${index}`} className="agent-message__paragraph">
                {block.content}
              </p>
            ) : (
              <div key={`code-${index}`} className="agent-message__code-block">
                <div className="agent-message__code-header">
                  <span className="agent-message__code-label">
                    {block.label || 'Suggested comment'}
                  </span>
                  <button
                    type="button"
                    className="agent-message__code-btn"
                    onClick={() => handleCopy(`code-${index}`, block.content)}
                  >
                    {copiedKey === `code-${index}` ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="agent-message__code">{block.content}</pre>
              </div>
            ),
          )}
        </div>
      )}

      {showPrepare && (
        <div className="agent-message__actions">
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={handlePrepare}
            disabled={preparing}
          >
            {preparing ? 'Preparing…' : 'Prepare for GitHub'}
          </button>
        </div>
      )}
    </div>
  );
}
