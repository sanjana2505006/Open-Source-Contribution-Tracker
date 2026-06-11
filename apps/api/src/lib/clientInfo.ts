import type { Request } from 'express';

export type ClientInfo = {
  ipAddress: string | null;
  userAgent: string | null;
};

export function getClientInfo(req: Request): ClientInfo {
  const forwarded = req.headers['x-forwarded-for'];
  const ip =
    (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : null) ??
    req.socket.remoteAddress ??
    null;

  const userAgent =
    typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : null;

  return { ipAddress: ip, userAgent };
}
