import type { NextFunction, Request, Response } from 'express';
import type { AuthService } from '../services/authService.js';
import { SESSION_COOKIE } from '../services/authService.js';

export function attachSession(auth: AuthService) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;

    if (token) {
      const user = await auth.getUserBySessionToken(token);
      if (user) req.user = user;
    }

    next();
  };
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    res.status(401).json({
      error: { code: 'UNAUTHORIZED', message: 'Sign in required' },
    });
    return;
  }
  next();
}
