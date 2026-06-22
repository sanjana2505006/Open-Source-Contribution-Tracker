import { useEffect, useState } from 'react';
import type { AgentProposedAction } from '@osct/shared';
import { copyToClipboard } from '../../lib/agentMessageUtils';

const GITHUB_COMMENT_LIMIT = 65536;

type Props = {
  action: AgentProposedAction;
  onApprove: (id: string, body: string) => Promise<void>;
  onCancel: (id: string) => Promise<void>;
};

export function AgentActionCard({ action, onApprove, onCancel }: Props) {
  const [body, setBody] = useState(action.preview.body);
  const [busy, setBusy] = useState<'approve' | 'cancel' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const isPending = action.status === 'pending';
  const isCompleted = action.status === 'completed';
  const isFailed = action.status === 'failed';
  const isCancelled = action.status === 'cancelled';

  async function handleCopy() {
    const ok = await copyToClipboard(body);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  }

  const charCount = body.length;
  const overLimit = charCount > GITHUB_COMMENT_LIMIT;

  useEffect(() => {
    setBody(action.preview.body);
  }, [action.id, action.preview.body]);

  async function handleApprove() {
    setBusy('approve');
    setError(null);
    try {
      await onApprove(action.id, body);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to post comment');
    } finally {
      setBusy(null);
    }
  }

  async function handleCancel() {
    setBusy('cancel');
    setError(null);
    try {
      await onCancel(action.id);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to cancel');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div
      className={`agent-action-card${isCompleted ? ' agent-action-card--completed' : ''}${isFailed ? ' agent-action-card--failed' : ''}${isCancelled ? ' agent-action-card--cancelled' : ''}`}
    >
      <div className="agent-action-card__header">
        <p className="agent-action-card__label">Proposed GitHub comment</p>
        <a
          href={action.preview.issueUrl}
          target="_blank"
          rel="noreferrer"
          className="agent-action-card__target"
        >
          {action.preview.owner}/{action.preview.repo}#{action.preview.number}
        </a>
      </div>

      {isPending ? (
        <>
          <textarea
            className="agent-action-card__body"
            rows={5}
            value={body}
            onChange={(event) => setBody(event.target.value)}
            disabled={busy !== null}
          />
          <p className={`agent-action-card__count${overLimit ? ' agent-action-card__count--over' : ''}`}>
            {charCount.toLocaleString()} / {GITHUB_COMMENT_LIMIT.toLocaleString()} characters
          </p>
          <p className="agent-action-card__hint">
            Review and edit before posting. Nothing is sent until you approve.
          </p>
          <div className="agent-action-card__actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleApprove}
              disabled={busy !== null || !body.trim() || overLimit}
            >
              {busy === 'approve' ? 'Posting…' : 'Approve & post'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCopy}
              disabled={busy !== null || !body.trim()}
            >
              {copied ? 'Copied' : 'Copy'}
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCancel}
              disabled={busy !== null}
            >
              {busy === 'cancel' ? 'Cancelling…' : 'Cancel'}
            </button>
          </div>
        </>
      ) : (
        <div className="agent-action-card__status">
          {isCompleted && (
            <>
              <p className="agent-action-card__success">Comment posted on GitHub.</p>
              {action.githubUrl && (
                <a href={action.githubUrl} target="_blank" rel="noreferrer">
                  View comment
                </a>
              )}
            </>
          )}
          {isCancelled && <p>Proposal cancelled.</p>}
          {isFailed && (
            <p className="agent-action-card__error">
              {action.errorMessage ?? 'Failed to post comment.'}
            </p>
          )}
        </div>
      )}

      {error && <p className="alert alert-error agent-action-card__error">{error}</p>}
    </div>
  );
}
