import type { GoodFirstIssueItem, IssueItem, UserSkillProfile } from '@osct/shared';

export function goodFirstIssueToIssueItem(issue: GoodFirstIssueItem): IssueItem {
  return {
    id: String(issue.id),
    title: issue.title,
    state: 'open',
    occurredAt: issue.updatedAt,
    htmlUrl: issue.htmlUrl,
    repositoryFullName: issue.repositoryFullName,
    roles: [],
  };
}

export function buildBeginnerMentorshipPrompt(
  issue: GoodFirstIssueItem,
  profile?: UserSkillProfile,
): string {
  const stack =
    profile?.languages.length && issue.language
      ? `My top languages from GitHub: ${profile.languages.map((l) => `${l.language} (${l.sharePercent}%)`).join(', ')}. This issue uses ${issue.language}.`
      : issue.language
        ? `Stack: ${issue.language}`
        : '';

  return `I'm a beginner trying to land my first (or early) open-source PR. Walk me through this good-first issue step by step.

Issue: ${issue.repositoryFullName}#${issue.number}
Title: ${issue.title}
URL: ${issue.htmlUrl}
${stack}
Why OSCT recommended it: ${issue.matchReason}

Give me a practical roadmap:

1. **Understand the issue** — what they're asking for in plain language
2. **Fork & clone** — exact steps for this repo (assume I might be new to forking)
3. **Branch name** — suggest a clear branch name for this issue
4. **Where to edit** — which files or folders to look at first (infer from the issue title/context; say what's uncertain)
5. **Approach** — what to change at a high level before I write code
6. **Commit & push** — the git commands (fork remote → branch → push)
7. **PR description** — draft a short, honest description I can paste when opening the PR

Keep it encouraging, specific to this repo/issue, and short enough to start today.`;
}
