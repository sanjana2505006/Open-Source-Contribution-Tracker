/** Resend's test sender — only delivers to the Resend account owner's email. */
const RESEND_SANDBOX_FROM = /onboarding@resend\.dev/i;

export function isResendSandboxFrom(fromEmail: string | undefined | null): boolean {
  if (!fromEmail) return false;
  return RESEND_SANDBOX_FROM.test(fromEmail);
}

export function getDigestEmailStartupMessage(env: {
  RESEND_API_KEY?: string;
  DIGEST_FROM_EMAIL?: string;
  NODE_ENV: string;
}): string {
  if (!env.RESEND_API_KEY || !env.DIGEST_FROM_EMAIL) {
    return 'Digest email: disabled — set RESEND_API_KEY + DIGEST_FROM_EMAIL to enable';
  }

  if (isResendSandboxFrom(env.DIGEST_FROM_EMAIL)) {
    return (
      'Digest email: SANDBOX sender (onboarding@resend.dev) — only delivers to your Resend ' +
      'account email. For real users, verify a domain at resend.com/domains and set ' +
      'DIGEST_FROM_EMAIL e.g. "OSCT <digest@yourdomain.com>"'
    );
  }

  return `Digest email: enabled (from ${env.DIGEST_FROM_EMAIL})`;
}

/** Map Resend API failures into a clear operator/user message when possible. */
export function describeResendSendFailure(status: number, body: string): string {
  const lower = body.toLowerCase();

  if (
    lower.includes('onboarding@resend.dev') ||
    lower.includes('only send testing emails') ||
    lower.includes('verify a domain') ||
    lower.includes('you can only send testing emails')
  ) {
    return (
      'Resend rejected this send: the from-address is still the sandbox sender ' +
      '(onboarding@resend.dev), which only delivers to your Resend account email. ' +
      'Verify a domain at https://resend.com/domains and set DIGEST_FROM_EMAIL to an address on that domain.'
    );
  }

  return `Resend API failed (${status}): ${body.slice(0, 300)}`;
}
