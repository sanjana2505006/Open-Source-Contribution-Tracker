import { describe, expect, it } from 'vitest';
import {
  describeResendSendFailure,
  getDigestEmailStartupMessage,
  isResendSandboxFrom,
} from './digestEmailConfig.js';

describe('digestEmailConfig', () => {
  it('detects Resend sandbox from-address', () => {
    expect(isResendSandboxFrom('OSCT <onboarding@resend.dev>')).toBe(true);
    expect(isResendSandboxFrom('OSCT <digest@example.com>')).toBe(false);
  });

  it('warns on startup when sandbox is configured', () => {
    const message = getDigestEmailStartupMessage({
      NODE_ENV: 'production',
      RESEND_API_KEY: 're_test',
      DIGEST_FROM_EMAIL: 'OSCT <onboarding@resend.dev>',
    });
    expect(message).toMatch(/SANDBOX/i);
    expect(message).toMatch(/resend\.com\/domains/i);
  });

  it('maps sandbox Resend API errors to an actionable message', () => {
    const message = describeResendSendFailure(
      403,
      'You can only send testing emails to your own email address with onboarding@resend.dev',
    );
    expect(message).toMatch(/sandbox/i);
    expect(message).toMatch(/verify a domain/i);
  });
});
