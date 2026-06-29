export function parsePullRequestUrl(input: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const match = input.trim().match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) return null;
  const number = Number(match[3]);
  if (!Number.isFinite(number) || number < 1) return null;
  return { owner: match[1]!, repo: match[2]!, number };
}
