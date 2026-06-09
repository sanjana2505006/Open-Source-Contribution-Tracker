export type HealthResponse = {
  status: 'ok' | 'degraded';
  db: 'up' | 'down';
  timestamp: string;
};
