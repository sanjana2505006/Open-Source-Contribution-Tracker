import type { WeeklyDigest } from '@osct/shared';

export function buildPlanMyWeekPrompt(digest: WeeklyDigest): string {
  const priorityLines = digest.topPriorities
    .slice(0, 5)
    .map((issue) => {
      const num = issue.issueNumber != null ? `#${issue.issueNumber}` : '';
      return `- ${issue.repositoryFullName}${num}: "${issue.title}" (${issue.stuckDays}d stuck — ${issue.stuckReason})`;
    })
    .join('\n');

  const groupLines = digest.groups
    .map((g) => `- ${g.reason}: ${g.count} issue${g.count === 1 ? '' : 's'}`)
    .join('\n');

  return `Plan my open-source week using my OSCT stuck-issue digest.

Week: ${digest.weekLabel}
Summary: ${digest.summary}

Top priorities:
${priorityLines || '(none listed)'}

Groups:
${groupLines || '(none)'}

Please give me:
1. A ranked list of 3–5 issues to focus on this week (with a short why for each)
2. One concrete next action per issue (e.g. follow-up comment, ask for assignment, close if abandoned)
3. A simple day-by-day plan (Mon–Fri) if it helps

Keep it practical, encouraging, and short enough to act on today.`;
}
