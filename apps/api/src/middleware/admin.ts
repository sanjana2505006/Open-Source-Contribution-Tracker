import type { NextFunction, Request, Response } from 'express';
import type { Env } from '../config/env.js';
import { isAdminUsername, parseAdminUsernames } from '../lib/adminUsers.js';
import { AppError } from './errorHandler.js';

export function requireAdmin(env: Env) {
  const admins = parseAdminUsernames(env.ADMIN_USERNAMES);

  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError(401, 'Sign in required', 'UNAUTHORIZED'));
      return;
    }

    if (admins.size === 0) {
      next(new AppError(503, 'Admin access is not configured', 'ADMIN_NOT_CONFIGURED'));
      return;
    }

    if (!isAdminUsername(req.user.username, admins)) {
      next(new AppError(403, 'Admin access only', 'FORBIDDEN'));
      return;
    }

    next();
  };
}

export function userIsAdmin(username: string, env: Env): boolean {
  return isAdminUsername(username, parseAdminUsernames(env.ADMIN_USERNAMES));
}
