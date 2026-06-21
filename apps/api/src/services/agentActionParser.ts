import type { AgentActionPayload, AgentActionType } from '@osct/shared';

const ACTION_BLOCK_RE = /```agent_action\s*\n([\s\S]*?)\n```/gi;

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
