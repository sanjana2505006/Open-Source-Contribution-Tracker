export type MessageBlock =
  | { type: 'text'; content: string }
  | { type: 'code'; label: string; content: string };

const CODE_FENCE_RE = /```([^\n]*)\n([\s\S]*?)```/g;

export function parseMessageBlocks(content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  let lastIndex = 0;

  for (const match of content.matchAll(CODE_FENCE_RE)) {
    const index = match.index ?? 0;
    const before = content.slice(lastIndex, index);
    if (before.trim()) {
      blocks.push({ type: 'text', content: before.trim() });
    }

    const label = match[1]?.trim() ?? '';
    const code = match[2]?.trim() ?? '';
    if (label.toLowerCase() !== 'agent_action' && code) {
      blocks.push({ type: 'code', label, content: code });
    }

    lastIndex = index + match[0].length;
  }

  const tail = content.slice(lastIndex).trim();
  if (tail) {
    blocks.push({ type: 'text', content: tail });
  }

  if (blocks.length === 0 && content.trim()) {
    blocks.push({ type: 'text', content: content.trim() });
  }

  return blocks;
}

export function extractSuggestedComments(content: string): string[] {
  return parseMessageBlocks(content)
    .filter((block): block is Extract<MessageBlock, { type: 'code' }> => block.type === 'code')
    .map((block) => block.content)
    .filter(Boolean);
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}
