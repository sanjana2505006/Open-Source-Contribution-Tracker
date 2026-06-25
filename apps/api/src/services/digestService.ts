import type {
  DigestEmailSendResponse,
  DigestIssueItem,
  DigestPreferences,
  DigestPreferencesUpdate,
  IssueRole,
  WeeklyDigest,
} from '@osct/shared';
import type { Env } from '../config/env.js';
import { ResendClient } from '../infrastructure/email/resendClient.js';
import { stuckDaysSince, stuckReason } from '../lib/stuckIssues.js';
import { AppError } from '../middleware/errorHandler.js';
import { ContributionRepository } from '../repositories/contributionRepository.js';
import { DigestRepository } from '../repositories/digestRepository.js';
import { UserRepository } from '../repositories/userRepository.js';
import type pg from 'pg';

const EMAIL_COOLDOWN_MS = 24 * 60 * 60 * 1000;

function parseRoles(raw: { roles?: string[] } | null): IssueRole[] {
  const roles = raw?.roles ?? [];
  return roles.filter(
    (role): role is IssueRole =>
      role === 'assigned' || role === 'authored' || role === 'commented',
  );
}

function parseIssueNumber(htmlUrl: string): number | null {
  const match = htmlUrl.match(/\/issues\/(\d+)/i);
  return match ? Number(match[1]) : null;
}

function weekLabel(now = new Date()): string {
  const end = new Date(now);
  const start = new Date(now);
  start.setDate(start.getDate() - 6);
  const fmt = (date: Date) =>
    date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
}

export class DigestService {
  private contributions: ContributionRepository;
  private digests: DigestRepository;
  private users: UserRepository;
  private resend: ResendClient | null;

  constructor(
    private env: Env,
    db: pg.Pool,
  ) {
    this.contributions = new ContributionRepository(db);
    this.digests = new DigestRepository(db);
    this.users = new UserRepository(db);
    this.resend =
      env.RESEND_API_KEY && env.DIGEST_FROM_EMAIL
        ? new ResendClient(env.RESEND_API_KEY, env.DIGEST_FROM_EMAIL)
        : null;
  }

  isEmailConfigured(): boolean {
    return Boolean(this.resend);
  }

  async getWeeklyDigest(userId: string): Promise<WeeklyDigest> {
    const { items, total } = await this.contributions.listIssues(userId, {
      role: 'stuck',
      sort: 'stuck',
      limit: 100,
    });

    const digestItems: DigestIssueItem[] = items.map((row) => {
      const roles = parseRoles(row.raw_metadata);
      return {
        id: row.id,
        title: row.title ?? 'Untitled issue',
        repositoryFullName: row.full_name,
        htmlUrl: row.html_url,
        issueNumber: parseIssueNumber(row.html_url),
        stuckDays: stuckDaysSince(row.raw_metadata, row.occurred_at),
        stuckReason: stuckReason(roles),
        roles,
      };
    });

    const groupMap = new Map<string, DigestIssueItem[]>();
    for (const item of digestItems) {
      const list = groupMap.get(item.stuckReason) ?? [];
      list.push(item);
      groupMap.set(item.stuckReason, list);
    }

    const groups = [...groupMap.entries()]
      .map(([reason, issues]) => ({
        reason,
        count: issues.length,
        issues: issues.sort((a, b) => b.stuckDays - a.stuckDays),
      }))
      .sort((a, b) => b.count - a.count);

    const topPriorities = [...digestItems]
      .sort((a, b) => b.stuckDays - a.stuckDays)
      .slice(0, 5);

    const now = new Date();
    const summary =
      total === 0
        ? 'No stuck issues this week — nice work keeping your inbox moving.'
        : total === 1
          ? 'You have 1 open issue with no activity for 30+ days.'
          : `You have ${total} open issues with no activity for 30+ days.`;

    return {
      weekLabel: weekLabel(now),
      generatedAt: now.toISOString(),
      stuckTotal: total,
      summary,
      topPriorities,
      groups,
    };
  }

  async getPreferences(userId: string): Promise<DigestPreferences> {
    const [prefs, user] = await Promise.all([
      this.digests.getPreferences(userId),
      this.users.findById(userId),
    ]);

    return {
      emailEnabled: prefs?.email_enabled ?? false,
      inAppEnabled: prefs?.in_app_enabled ?? true,
      lastEmailSentAt: prefs?.last_email_sent_at?.toISOString() ?? null,
      emailAvailable: Boolean(user?.email),
      emailDeliveryConfigured: this.isEmailConfigured(),
    };
  }

  async updatePreferences(
    userId: string,
    input: DigestPreferencesUpdate,
  ): Promise<DigestPreferences> {
    if (input.emailEnabled === true) {
      const user = await this.users.findById(userId);
      if (!user?.email) {
        throw new AppError(
          400,
          'No email on your GitHub profile. Add a public email on GitHub or disable email digest.',
          'VALIDATION_ERROR',
        );
      }
      if (!this.isEmailConfigured()) {
        throw new AppError(
          503,
          'Email digest is not configured on this server yet.',
          'DIGEST_EMAIL_DISABLED',
        );
      }
    }

    await this.digests.upsertPreferences({
      userId,
      emailEnabled: input.emailEnabled,
      inAppEnabled: input.inAppEnabled,
    });

    return this.getPreferences(userId);
  }

  async sendWeeklyEmail(userId: string, force = false): Promise<DigestEmailSendResponse> {
    if (!this.resend) {
      return {
        sent: false,
        message: 'Email is not configured on this server (missing RESEND_API_KEY).',
      };
    }

    const [user, prefs, digest] = await Promise.all([
      this.users.findById(userId),
      this.digests.getPreferences(userId),
      this.getWeeklyDigest(userId),
    ]);

    if (!user?.email) {
      throw new AppError(400, 'No email address on your GitHub profile.', 'VALIDATION_ERROR');
    }

    if (!force && prefs?.last_email_sent_at) {
      const elapsed = Date.now() - prefs.last_email_sent_at.getTime();
      if (elapsed < EMAIL_COOLDOWN_MS) {
        throw new AppError(
          429,
          'Digest email was sent recently. Try again tomorrow.',
          'RATE_LIMITED',
        );
      }
    }

    const subject =
      digest.stuckTotal === 0
        ? `OSCT weekly digest — no stuck issues`
        : `OSCT weekly digest — ${digest.stuckTotal} stuck issue${digest.stuckTotal === 1 ? '' : 's'}`;

    const { html, text } = renderDigestEmail(digest, user.username, this.env.WEB_ORIGIN);

    await this.resend.send({
      to: user.email,
      subject,
      html,
      text,
    });

    await this.digests.upsertPreferences({ userId, emailEnabled: prefs?.email_enabled ?? true });
    await this.digests.markEmailSent(userId);

    return { sent: true, message: `Digest sent to ${user.email}` };
  }

  async runWeeklyCron(secret: string | undefined): Promise<{ sent: number; skipped: number }> {
    if (!this.env.CRON_SECRET || secret !== this.env.CRON_SECRET) {
      throw new AppError(401, 'Invalid cron secret', 'UNAUTHORIZED');
    }
    if (!this.resend) {
      throw new AppError(503, 'Email not configured', 'DIGEST_EMAIL_DISABLED');
    }

    const userIds = await this.digests.listEmailEnabledUserIds();
    let sent = 0;
    let skipped = 0;

    for (const userId of userIds) {
      try {
        const result = await this.sendWeeklyEmail(userId, true);
        if (result.sent) sent += 1;
        else skipped += 1;
      } catch (err) {
        if (err instanceof AppError && err.statusCode === 429) {
          skipped += 1;
          continue;
        }
        console.error(`Weekly digest failed for user ${userId}:`, err);
        skipped += 1;
      }
    }

    return { sent, skipped };
  }
}

function renderDigestEmail(
  digest: WeeklyDigest,
  username: string,
  appUrl: string,
): { html: string; text: string } {
  const lines: string[] = [
    `Hi @${username},`,
    '',
    digest.summary,
    '',
    `Week: ${digest.weekLabel}`,
    '',
  ];

  if (digest.topPriorities.length > 0) {
    lines.push('Top priorities:');
    for (const issue of digest.topPriorities) {
      lines.push(
        `• ${issue.repositoryFullName}#${issue.issueNumber ?? '?'} — ${issue.title} (${issue.stuckDays}d · ${issue.stuckReason})`,
      );
      lines.push(`  ${issue.htmlUrl}`);
    }
    lines.push('');
  }

  lines.push(`Open full digest: ${appUrl}/digest`);
  lines.push('');
  lines.push('— OSCT (Open Source Contribution Tracker)');

  const priorityHtml = digest.topPriorities
    .map(
      (issue) =>
        `<li><strong>${escapeHtml(issue.repositoryFullName)}#${issue.issueNumber ?? '?'}</strong> — ${escapeHtml(issue.title)}<br><span style="color:#6e7681">${issue.stuckDays} days · ${escapeHtml(issue.stuckReason)}</span><br><a href="${issue.htmlUrl}">${issue.htmlUrl}</a></li>`,
    )
    .join('');

  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:560px;color:#1f2328">
      <p>Hi <strong>@${escapeHtml(username)}</strong>,</p>
      <p>${escapeHtml(digest.summary)}</p>
      <p style="color:#6e7681;font-size:14px">Week: ${escapeHtml(digest.weekLabel)}</p>
      ${digest.topPriorities.length > 0 ? `<p><strong>Top priorities</strong></p><ul>${priorityHtml}</ul>` : ''}
      <p><a href="${appUrl}/digest">View full digest in OSCT</a></p>
      <p style="color:#6e7681;font-size:12px">OSCT · Open Source Contribution Tracker</p>
    </div>
  `.trim();

  return { html, text: lines.join('\n') };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
