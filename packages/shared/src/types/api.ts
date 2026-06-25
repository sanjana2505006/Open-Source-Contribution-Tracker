export type HealthResponse = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  /** digest_preferences table applied — weekly digest email prefs need this */
  digest?: 'ready' | 'pending';
  /** Resend API key + from address configured for digest email */
  digestEmail?: 'configured' | 'disabled';
  timestamp: string;
  /** Git commit deployed on Render — use to confirm latest code is live. */
  version?: string | null;
};
