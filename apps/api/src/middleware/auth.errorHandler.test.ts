import { describe, expect, it, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { AppError, errorHandler } from './errorHandler.js';
import { requireAuth } from './auth.js';

function mockRes() {
  const res = {
    statusCode: 200,
    body: undefined as unknown,
    status(code: number) {
      this.statusCode = code;
      return this;
    },
    json(payload: unknown) {
      this.body = payload;
      return this;
    },
  };
  return res as unknown as Response & { statusCode: number; body: unknown };
}

describe('errorHandler', () => {
  it('returns AppError status and payload', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    errorHandler(new AppError(400, 'Bad input', 'VALIDATION_ERROR'), {} as Request, res, next);

    expect(res.statusCode).toBe(400);
    expect(res.body).toEqual({
      error: { code: 'VALIDATION_ERROR', message: 'Bad input' },
    });
  });

  it('hides unexpected errors behind 500', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    errorHandler(new Error('secret internals'), {} as Request, res, next);

    expect(res.statusCode).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Something went wrong' },
    });
    spy.mockRestore();
  });
});

describe('requireAuth', () => {
  it('rejects unauthenticated requests', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth({} as Request, res, next);

    expect(res.statusCode).toBe(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows authenticated requests', () => {
    const res = mockRes();
    const next = vi.fn() as unknown as NextFunction;

    requireAuth({ user: { id: 'u1' } } as unknown as Request, res, next);

    expect(next).toHaveBeenCalledOnce();
  });
});
