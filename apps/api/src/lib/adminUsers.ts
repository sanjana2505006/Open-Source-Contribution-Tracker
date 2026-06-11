export function parseAdminUsernames(value: string | undefined): Set<string> {
  if (!value?.trim()) return new Set();

  return new Set(
    value
      .split(',')
      .map((name) => name.trim().toLowerCase())
      .filter(Boolean),
  );
}

export function isAdminUsername(username: string, admins: Set<string>): boolean {
  return admins.has(username.toLowerCase());
}
