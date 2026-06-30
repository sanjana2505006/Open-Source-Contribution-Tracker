import { useCallback, useEffect, useRef, useState } from 'react';
import type {
  AgentContext,
  AgentMessageRecord,
  AgentProposedAction,
  AgentSource,
  IssueAiCheckResult,
  IssueItem,
  PrAiCheckResult,
  PullRequestItem,
} from '@osct/shared';
import { parseIssueFromAgentItem, parsePullRequestFromItem } from '../../lib/agentContext';
import {
  approveAgentAction,
  cancelAgentAction,
  fetchAgentSession,
  fetchAgentStatus,
  proposeAgentAction,
  sendAgentChat,
} from '../../lib/agentApi';
import { checkIssueAi } from '../../lib/issueAiApi';
import { checkPullRequestAi } from '../../lib/prAiApi';
import { PUBLIC_SITE_ORIGIN } from '../../lib/portfolio';
import { AiCheckResultView } from '../AiCheckResultView';
import { AgentActionCard } from './AgentActionCard';
import { AgentContextChip } from './AgentContextChip';
import { AgentMessage } from './AgentMessage';

type Props = {
  open: boolean;
  onClose: () => void;
  issue?: IssueItem | null;
  pullRequest?: PullRequestItem | null;
  starters?: string[];
  panelTitle?: string;
  panelSubtitle?: string;
  /** Auto-send when the panel opens and the agent is ready */
  initialMessage?: string | null;
  onInitialMessageSent?: () => void;
  /** Run AI check as soon as the panel opens (issue or PR context required) */
  initialAiCheck?: boolean;
  onInitialAiCheckDone?: () => void;
  /** @deprecated Use initialAiCheck */
  initialPrAiCheck?: boolean;
  /** @deprecated Use onInitialAiCheckDone */
  onInitialPrAiCheckDone?: () => void;
  /** Beginner mentorship mode — issue → first PR roadmap */
  variant?: 'default' | 'mentorship';
};

const DEFAULT_STARTERS = [
  'What should I do about this issue?',
  'Summarize the discussion so far.',
  'Draft a follow-up comment and prepare it for posting.',
  'Why might this issue be stuck?',
];

const PR_STARTERS = [
  'Summarize what this PR changes.',
  'What would a maintainer look for in review?',
  'How can I make this PR sound more thoughtful and less generic?',
];

const MENTORSHIP_STARTERS = [
  'Which files should I look at first?',
  'Suggest a branch name for this issue.',
  'Draft my PR description.',
  'What if I get stuck after forking?',
];

export function AgentPanel({
  open,
  onClose,
  issue,
  pullRequest,
  starters,
  panelTitle,
  panelSubtitle,
  initialMessage = null,
  onInitialMessageSent,
  initialAiCheck = false,
  onInitialAiCheckDone,
  initialPrAiCheck = false,
  onInitialPrAiCheckDone,
  variant = 'default',
}: Props) {
  const runInitialAiCheck = initialAiCheck || initialPrAiCheck;
  const onRunInitialAiCheckDone = onInitialAiCheckDone ?? onInitialPrAiCheckDone;
  const isMentorship = variant === 'mentorship';
  const isPrMode = Boolean(pullRequest);
  const isIssueMode = Boolean(issue);
  const canAiCheck = isPrMode || isIssueMode;
  const resolvedStarters =
    starters ?? (isMentorship ? MENTORSHIP_STARTERS : isPrMode ? PR_STARTERS : DEFAULT_STARTERS);
  const resolvedTitle =
    panelTitle ?? (isMentorship ? 'Your mentor' : isPrMode ? 'PR assistant' : 'Issue assistant');
  const resolvedSubtitle =
    panelSubtitle ??
    (isMentorship
      ? 'From issue to merged PR — fork, branch, files, and your PR description.'
      : isPrMode
        ? 'Review pull requests, check if they read AI-generated, and get feedback before maintainers do.'
        : 'Triage stuck issues, check if they read AI-generated, and post approved comments to GitHub.');

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [providerInfo, setProviderInfo] = useState<string | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [statusRetry, setStatusRetry] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AgentMessageRecord[]>([]);
  const [actions, setActions] = useState<AgentProposedAction[]>([]);
  const [sources, setSources] = useState<AgentSource[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [aiCheckLoading, setAiCheckLoading] = useState(false);
  const [aiCheckError, setAiCheckError] = useState<string | null>(null);
  const [aiCheckResult, setAiCheckResult] = useState<PrAiCheckResult | IssueAiCheckResult | null>(
    null,
  );
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const initialMessageSentRef = useRef(false);
  const initialAiCheckRef = useRef(false);

  const aiCheckLabel = isPrMode ? 'Check the PR' : 'Check the issue';
  const aiCheckLoadingLabel = isPrMode ? 'Checking the PR…' : 'Checking the issue…';
  const aiCheckAnalyzingLabel = isPrMode ? 'Analyzing pull request…' : 'Analyzing issue…';

  const context: AgentContext = pullRequest
    ? (() => {
        const parsed = parsePullRequestFromItem(pullRequest);
        return parsed
          ? { type: 'pull_request', owner: parsed.owner, repo: parsed.repo, number: parsed.number }
          : { type: 'general' };
      })()
    : issue
      ? (() => {
          const parsed = parseIssueFromAgentItem(issue);
          return parsed
            ? { type: 'issue', owner: parsed.owner, repo: parsed.repo, number: parsed.number }
            : { type: 'general' };
        })()
      : { type: 'general' };

  const contextLabel = pullRequest
    ? `${pullRequest.repositoryFullName} — ${pullRequest.title}`
    : issue
      ? `${issue.repositoryFullName} — ${issue.title}`
      : undefined;

  useEffect(() => {
    if (!open) return;

    setError(null);
    setStatusError(null);
    fetchAgentStatus()
      .then((status) => {
        setEnabled(status.enabled);
        setProviderInfo(
          status.enabled && status.provider
            ? `${status.provider} · ${status.model ?? 'default model'}`
            : null,
        );
      })
      .catch((err: unknown) => {
        setEnabled(null);
        setStatusError(
          err instanceof Error ? err.message : 'Could not reach the agent status API',
        );
      });

    inputRef.current?.focus();
  }, [open, statusRetry]);

  useEffect(() => {
    if (!open) {
      setSessionId(null);
      setMessages([]);
      setActions([]);
      setSources([]);
      setInput('');
      setError(null);
      setAiCheckLoading(false);
      setAiCheckError(null);
      setAiCheckResult(null);
      initialMessageSentRef.current = false;
      initialAiCheckRef.current = false;
    }
  }, [open, issue?.id, pullRequest?.id]);

  const runAiCheck = useCallback(async () => {
    if (pullRequest) {
      const parsed = parsePullRequestFromItem(pullRequest);
      if (!parsed) {
        setAiCheckError('Could not parse this pull request URL.');
        return;
      }

      setAiCheckLoading(true);
      setAiCheckError(null);
      setAiCheckResult(null);

      try {
        const data = await checkPullRequestAi({
          owner: parsed.owner,
          repo: parsed.repo,
          number: parsed.number,
        });
        setAiCheckResult(data);
      } catch (err) {
        setAiCheckError(err instanceof Error ? err.message : 'PR analysis failed');
      } finally {
        setAiCheckLoading(false);
      }
      return;
    }

    if (!issue) return;

    const parsed = parseIssueFromAgentItem(issue);
    if (!parsed) {
      setAiCheckError('Could not parse this issue URL.');
      return;
    }

    setAiCheckLoading(true);
    setAiCheckError(null);
    setAiCheckResult(null);

    try {
      const data = await checkIssueAi({
        owner: parsed.owner,
        repo: parsed.repo,
        number: parsed.number,
      });
      setAiCheckResult(data);
    } catch (err) {
      setAiCheckError(err instanceof Error ? err.message : 'Issue analysis failed');
    } finally {
      setAiCheckLoading(false);
    }
  }, [issue, pullRequest]);

  useEffect(() => {
    if (!open || !runInitialAiCheck || !canAiCheck || initialAiCheckRef.current) return;
    initialAiCheckRef.current = true;
    void runAiCheck().finally(() => {
      onRunInitialAiCheckDone?.();
    });
  }, [open, runInitialAiCheck, canAiCheck, runAiCheck, onRunInitialAiCheckDone]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const handleSend = useCallback(
    async (message: string) => {
      const trimmed = message.trim();
      if (!trimmed || sending) return;

      setSending(true);
      setError(null);

      const optimisticUser: AgentMessageRecord = {
        id: `local-${Date.now()}`,
        role: 'user',
        content: trimmed,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, optimisticUser]);
      setInput('');

      try {
        const response = await sendAgentChat({
          message: trimmed,
          sessionId: sessionId ?? undefined,
          context,
        });
        setSessionId(response.sessionId);
        setSources(response.sources);

        const detail = await fetchAgentSession(response.sessionId);
        setMessages(detail.messages);
        setActions(detail.actions);
      } catch (err: unknown) {
        setMessages((prev) => prev.filter((row) => row.id !== optimisticUser.id));
        setInput(trimmed);
        setError(err instanceof Error ? err.message : 'Agent request failed');
      } finally {
        setSending(false);
      }
    },
    [context, sending, sessionId],
  );

  useEffect(() => {
    if (!open || !initialMessage || enabled !== true || sending || initialMessageSentRef.current) {
      return;
    }
    if (messages.length > 0) return;

    initialMessageSentRef.current = true;
    void handleSend(initialMessage).finally(() => {
      onInitialMessageSent?.();
    });
  }, [open, initialMessage, enabled, sending, messages.length, handleSend, onInitialMessageSent]);

  async function refreshSession(id: string) {
    const detail = await fetchAgentSession(id);
    setMessages(detail.messages);
    setActions(detail.actions);
  }

  async function handleApproveAction(actionId: string, body: string) {
    if (!sessionId) return;
    await approveAgentAction(actionId, body);
    await refreshSession(sessionId);
  }

  async function handlePrepareComment(body: string) {
    if (!sessionId || context.type !== 'issue' || !context.owner || !context.repo || !context.number) {
      return;
    }
    await proposeAgentAction({
      sessionId,
      owner: context.owner,
      repo: context.repo,
      number: context.number,
      body,
    });
    await refreshSession(sessionId);
  }

  async function handleCancelAction(actionId: string) {
    if (!sessionId) return;
    await cancelAgentAction(actionId);
    await refreshSession(sessionId);
  }

  if (!open) return null;

  const pendingActions = actions.filter((action) => action.status === 'pending');
  const resolvedActions = actions.filter((action) => action.status !== 'pending');

  const isDeployed =
    typeof window !== 'undefined' && window.location.origin === PUBLIC_SITE_ORIGIN;

  return (
    <div className="agent-panel-backdrop" role="presentation" onClick={onClose}>
      <aside
        className="agent-panel"
        role="dialog"
        aria-labelledby="agent-panel-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="agent-panel__header">
          <div>
            <p className="agent-panel__eyebrow">AI · review before posting</p>
            <h2 id="agent-panel-title" className="agent-panel__title">
              {resolvedTitle}
            </h2>
            <p className="agent-panel__subtitle">{resolvedSubtitle}</p>
            <AgentContextChip context={context} label={contextLabel} />
          </div>
          <button type="button" className="agent-panel__close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </header>

        <div className="agent-panel__body">
          {statusError && (
            <div className="agent-panel__status-error">
              <p className="alert alert-error agent-panel__error">{statusError}</p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setStatusRetry((n) => n + 1)}
              >
                Retry connection
              </button>
            </div>
          )}

          {enabled === false && !statusError && (
            <p className="agent-panel__notice">
              {isDeployed ? (
                <>
                  Agent is not configured on <strong>production</strong>. Pushing to GitHub does not
                  send your local <code>.env</code> file. In the{' '}
                  <a
                    href="https://dashboard.render.com"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Render dashboard
                  </a>
                  , open your <code>osct</code> service → <strong>Environment</strong> → add{' '}
                  <code>AGENT_PROVIDER=groq</code>, <code>GROQ_API_KEY</code> (your key), and{' '}
                  <code>AGENT_MODEL=llama-3.3-70b-versatile</code>, then redeploy. Get a free key at{' '}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                    console.groq.com
                  </a>
                  .
                </>
              ) : (
                <>
                  Agent is not configured on the API server. Add <code>GROQ_API_KEY</code> to{' '}
                  <code>.env</code>, then <strong>restart</strong> <code>npm run dev</code> (saving
                  .env alone is not enough). Get a free key at{' '}
                  <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer">
                    console.groq.com
                  </a>
                  .
                </>
              )}
            </p>
          )}

          {providerInfo && (
            <p className="agent-panel__provider">Connected via {providerInfo}</p>
          )}

          {messages.length === 0 && enabled === true && !aiCheckResult && (
            <div className="agent-panel__starters">
              <p className="agent-panel__starters-label">Try asking:</p>
              <div className="agent-panel__starter-list">
                {canAiCheck && (
                  <button
                    type="button"
                    className="agent-panel__starter agent-panel__starter--primary"
                    onClick={() => void runAiCheck()}
                    disabled={aiCheckLoading || sending}
                  >
                    {aiCheckLoading ? aiCheckLoadingLabel : aiCheckLabel}
                  </button>
                )}
                {resolvedStarters.map((starter) => (
                  <button
                    key={starter}
                    type="button"
                    className="agent-panel__starter"
                    onClick={() => handleSend(starter)}
                    disabled={sending || aiCheckLoading}
                  >
                    {starter}
                  </button>
                ))}
              </div>
            </div>
          )}

          {aiCheckLoading && <p className="agent-panel__typing">{aiCheckAnalyzingLabel}</p>}
          {aiCheckError && <p className="alert alert-error agent-panel__error">{aiCheckError}</p>}
          {aiCheckResult && <AiCheckResultView result={aiCheckResult} />}

          {messages.map((message) => (
            <AgentMessage
              key={message.id}
              role={message.role}
              content={message.content}
              issueContext={context.type === 'issue' ? context : null}
              canPropose={enabled === true && Boolean(sessionId)}
              onPrepareComment={handlePrepareComment}
            />
          ))}

          {pendingActions.length > 0 && (
            <div className="agent-panel__actions">
              <p className="agent-panel__actions-label">Ready to post — review & approve</p>
              {pendingActions.map((action) => (
                <AgentActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveAction}
                  onCancel={handleCancelAction}
                />
              ))}
            </div>
          )}

          {resolvedActions.length > 0 && (
            <div className="agent-panel__actions agent-panel__actions--resolved">
              <p className="agent-panel__actions-label">Recent activity</p>
              {resolvedActions.map((action) => (
                <AgentActionCard
                  key={action.id}
                  action={action}
                  onApprove={handleApproveAction}
                  onCancel={handleCancelAction}
                />
              ))}
            </div>
          )}

          {sending && <p className="agent-panel__typing">Thinking…</p>}
          {error && <p className="alert alert-error agent-panel__error">{error}</p>}

          {sources.length > 0 && (
            <div className="agent-panel__sources">
              <p className="agent-panel__sources-label">Sources</p>
              <ul>
                {sources.map((source) => (
                  <li key={source.url}>
                    <a href={source.url} target="_blank" rel="noreferrer">
                      {source.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        <footer className="agent-panel__footer">
          <textarea
            ref={inputRef}
            className="agent-panel__input"
            rows={3}
            placeholder={
              isMentorship
                ? 'Ask about fork, branch, files, or your PR…'
                : pullRequest
                  ? 'Ask about this pull request…'
                  : issue
                    ? 'Ask about this stuck issue…'
                    : 'Ask about your stuck issues or weekly plan…'
            }
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                handleSend(input);
              }
            }}
            disabled={sending || enabled !== true}
          />
          <button
            type="button"
            className="btn btn-primary agent-panel__send"
            onClick={() => handleSend(input)}
            disabled={sending || !input.trim() || enabled !== true}
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </footer>
      </aside>
    </div>
  );
}
