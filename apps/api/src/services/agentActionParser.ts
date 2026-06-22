import type { AgentActionPayload, AgentActionType, AgentContext } from '@osct/shared';

const ACTION_BLOCK_RE = /```agent_action\s*\n([\s\S]*?)\n```/gi;
const CODE_FENCE_RE = /```([^\n]*)\n([\s\S]*?)```/g;

const POST_INTENT_RE =
  /\b(post|publish|prepare|send|submit|approve)\b.*\b(comment|reply|follow-?up|github)\b|\bprepare\b.*\bfor posting\b/i;

type ParsedActionBlock = {
  type: AgentActionType;
  owner: string;
  repo: string;
  number: number;
  body: string;
};

export function parseAgentActionBlocks(text: string): {
  cleanReply: string;
  proposals: AgentActionPayload[];
} {
  const proposals: AgentActionPayload[] = [];
  let cleanReply = text;

  for (const match of text.matchAll(ACTION_BLOCK_RE)) {
    const block = match[0];
    const rawJson = match[1]?.trim();
    if (!rawJson) continue;

    try {
      const parsed = JSON.parse(rawJson) as Partial<ParsedActionBlock>;
      if (
        parsed.type === 'comment_on_issue' &&
        parsed.owner?.trim() &&
        parsed.repo?.trim() &&
        typeof parsed.number === 'number' &&
        parsed.number > 0 &&
        parsed.body?.trim()
      ) {
        proposals.push({
          owner: parsed.owner.trim(),
          repo: parsed.repo.trim(),
          number: parsed.number,
          body: parsed.body.trim(),
        });
      }
    } catch {
      // Ignore malformed blocks — assistant reply still shown without the proposal.
    }

    cleanReply = cleanReply.replace(block, '').trim();
  }

  cleanReply = cleanReply.replace(/\n{3,}/g, '\n\n').trim();

  return { cleanReply, proposals };
}

export function extractSuggestedComments(text: string): string[] {
  const results: string[] = [];

  for (const match of text.matchAll(CODE_FENCE_RE)) {
    const label = match[1]?.trim().toLowerCase() ?? '';
    const body = match[2]?.trim();
    if (!body || label === 'agent_action') continue;

    if (
      label === '' ||
      label.includes('comment') ||
      label.includes('suggested') ||
      label.includes('reply') ||
      label.includes('draft')
    ) {
      results.push(body);
    }
  }

  return results;
}

export function inferProposalsFromDraft(
  reply: string,
  userMessage: string,
  context?: AgentContext,
): AgentActionPayload[] {
  if (context?.type !== 'issue' || !context.owner || !context.repo || !context.number) {
    return [];
  }

  const drafts = extractSuggestedComments(reply);
  if (drafts.length === 0) return [];

  const wantsPost = POST_INTENT_RE.test(userMessage);
  if (!wantsPost) return [];

  return [
    {
      owner: context.owner,
      repo: context.repo,
      number: context.number,
      body: drafts[0]!,
    },
  ];
}
