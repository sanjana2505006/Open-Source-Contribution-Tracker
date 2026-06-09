import type { UserProfile } from '@osct/shared';

declare global {
  namespace Express {
    interface Request {
      user?: UserProfile;
    }
  }
}

export {};
