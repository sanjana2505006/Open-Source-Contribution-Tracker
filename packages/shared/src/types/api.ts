export type HealthResponse = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  timestamp: string;
  /** Git commit deployed on Render — use to confirm latest code is live. */
  version?: string | null;
};
