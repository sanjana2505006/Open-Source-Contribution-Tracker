export function parsePullRequestUrl(input: string): {
  owner: string;
  repo: string;
  number: number;
} | null {
  const trimmed = input.trim();
  const match = trimmed.match(/github\.com\/([^/]+)\/([^/]+)\/pull\/(\d+)/i);
  if (!match) return null;
  const number = Number(match[3]);
  if (!Number.isFinite(number) || number < 1) return null;
  return {
    owner: match[1]!,
    repo: match[2]!,
    number,
  };
}

export function pullRequestRefKey(owner: string, repo: string, number: number): string {
  return `${owner.toLowerCase()}/${repo.toLowerCase()}#${number}`;
}
