export function repoPath(fullName: string): string {
  const slash = fullName.indexOf('/');
  if (slash === -1) return `/repos?repo=${encodeURIComponent(fullName)}`;
  const owner = fullName.slice(0, slash);
  const name = fullName.slice(slash + 1);
  return `/repo/${encodeURIComponent(owner)}/${encodeURIComponent(name)}`;
}

export function repoFullName(owner: string, name: string): string {
  return `${decodeURIComponent(owner)}/${decodeURIComponent(name)}`;
}
