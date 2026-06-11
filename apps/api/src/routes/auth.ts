import type { Request, Response } from 'express';
import type { AuthService } from '../services/authService.js';
import { OAUTH_STATE_COOKIE, SESSION_COOKIE } from '../services/authService.js';
import { generateToken } from '../infrastructure/auth/crypto.js';
import type { Env } from '../config/env.js';
import { getClientInfo } from '../lib/clientInfo.js';
import { userIsAdmin } from '../middleware/admin.js';

function sessionCookieOptions(env: Env, maxAgeMs: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: maxAgeMs,
    path: '/',
  };
}

export function createAuthRoutes(auth: AuthService, env: Env) {
  return {
    githubLogin(_req: Request, res: Response): void {
      const state = generateToken(16);
      res.cookie(OAUTH_STATE_COOKIE, state, sessionCookieOptions(env, 10 * 60 * 1000));
      res.redirect(auth.startOAuth(state));
    },

    async githubCallback(req: Request, res: Response): Promise<void> {
      const { code, state } = req.query;
      const savedState = req.cookies?.[OAUTH_STATE_COOKIE] as string | undefined;

      res.clearCookie(OAUTH_STATE_COOKIE, { path: '/' });

      if (
        typeof code !== 'string' ||
        typeof state !== 'string' ||
        !savedState ||
        state !== savedState
      ) {
        res.redirect(`${env.WEB_ORIGIN}/?error=oauth_state`);
        return;
      }

      try {
        const { sessionToken } = await auth.completeOAuth(code, getClientInfo(req));
        const maxAge = env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;
        res.cookie(SESSION_COOKIE, sessionToken, sessionCookieOptions(env, maxAge));
        res.redirect(`${env.WEB_ORIGIN}/`);
      } catch (err) {
        console.error('OAuth callback failed:', err);
        res.redirect(`${env.WEB_ORIGIN}/?error=oauth_failed`);
      }
    },

    async logout(req: Request, res: Response): Promise<void> {
      const token = req.cookies?.[SESSION_COOKIE] as string | undefined;
      if (token) {
        await auth.logout(token);
      }
      res.clearCookie(SESSION_COOKIE, { path: '/' });
      res.status(204).send();
    },
  };
}

export function createUserRoutes(env: Env) {
  return {
    me(req: Request, res: Response): void {
      const user = req.user!;
      res.json({
        data: {
          ...user,
          isAdmin: userIsAdmin(user.username, env),
        },
      });
    },
  };
}
