import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import { testEnv } from './test/testEnv.js';

const query = vi.fn();
const connect = vi.fn();
const checkDbConnection = vi.fn(async () => true);

vi.mock('./infrastructure/db/pool.js', () => ({
  getPool: () => ({
    query,
    connect,
    end: vi.fn(),
  }),
  checkDbConnection,
  closePool: vi.fn(async () => {}),
}));

describe('API smoke (auth + health)', () => {
  beforeEach(() => {
    query.mockReset();
    connect.mockReset();
    checkDbConnection.mockReset();
    checkDbConnection.mockResolvedValue(true);
    query.mockResolvedValue({ rows: [{ ready: true }] });
    connect.mockResolvedValue({
      query: vi.fn(async () => ({ rows: [] })),
      release: vi.fn(),
    });
  });

  it('GET /api/v1/health returns ok when db is up', async () => {
    const { createApp } = await import('./app.js');
    const app = createApp(testEnv());

    const res = await request(app).get('/api/v1/health');

    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      status: 'ok',
      db: 'up',
    });
    expect(res.body.data).not.toHaveProperty('version');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });

  it('GET /api/v1/users/me returns 401 without a session', async () => {
    const { createApp } = await import('./app.js');
    const app = createApp(testEnv());

    const res = await request(app).get('/api/v1/users/me');

    expect(res.status).toBe(401);
    expect(res.body.error).toMatchObject({
      code: 'UNAUTHORIZED',
      message: 'Sign in required',
    });
  });

  it('POST /api/v1/sync returns 401 without a session', async () => {
    const { createApp } = await import('./app.js');
    const app = createApp(testEnv());

    const res = await request(app).post('/api/v1/sync');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });
});
