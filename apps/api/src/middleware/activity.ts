import type { NextFunction, Request, Response } from 'express';
import type { SessionRepository } from '../repositories/sessionRepository.js';
import { SESSION_COOKIE } from '../services/authService.js';

const lastTouch = new Map<string, number>();
const TOUCH_INTERVAL_MS = 60_000;

export function createActivityMiddleware(sessions: SessionRepository) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      next();
      return;
    }

    const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
    if (!token) {
      next();
      return;
    }

    const now = Date.now();
    const previous = lastTouch.get(token) ?? 0;

    if (now - previous >= TOUCH_INTERVAL_MS) {
      try {
        const session = await sessions.findByToken(token);
        if (session) {
          await sessions.touch(session.id);
          lastTouch.set(token, now);
        }
      } catch {
        // ignore activity tracking errors
      }
    }

    next();
  };
}
