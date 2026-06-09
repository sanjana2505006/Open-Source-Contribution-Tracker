import type { UserProfile } from '@osct/shared';
import type { Env } from '../config/env.js';
import { toUserProfile } from '../domain/user.js';
import { encryptToken, generateToken } from '../infrastructure/auth/crypto.js';
import {
  buildAuthorizeUrl,
  exchangeCodeForToken,
  fetchGitHubUser,
} from '../infrastructure/github/client.js';
import { OAuthRepository } from '../repositories/oauthRepository.js';
import { SessionRepository } from '../repositories/sessionRepository.js';
import { UserRepository } from '../repositories/userRepository.js';

export const SESSION_COOKIE = 'osct_session';
export const OAUTH_STATE_COOKIE = 'osct_oauth_state';

export class AuthService {
  private users: UserRepository;
  private oauth: OAuthRepository;
  private sessions: SessionRepository;

  constructor(
    private env: Env,
    db: import('pg').Pool,
  ) {
    this.users = new UserRepository(db);
    this.oauth = new OAuthRepository(db);
    this.sessions = new SessionRepository(db);
  }

  getCallbackUrl(): string {
    return `${this.env.API_ORIGIN}/api/v1/auth/github/callback`;
  }

  startOAuth(state: string): string {
    return buildAuthorizeUrl(
      this.env.GITHUB_CLIENT_ID,
      this.getCallbackUrl(),
      state,
    );
  }

  async completeOAuth(code: string): Promise<{ sessionToken: string; user: UserProfile }> {
    const tokenRes = await exchangeCodeForToken(
      code,
      this.env.GITHUB_CLIENT_ID,
      this.env.GITHUB_CLIENT_SECRET,
      this.getCallbackUrl(),
    );

    const ghUser = await fetchGitHubUser(tokenRes.access_token);

    const user = await this.users.upsert({
      githubId: ghUser.id,
      username: ghUser.login,
      displayName: ghUser.name,
      avatarUrl: ghUser.avatar_url,
      bio: ghUser.bio,
      email: ghUser.email,
      profileUrl: ghUser.html_url,
    });

    const encryptedToken = encryptToken(tokenRes.access_token, this.env.SESSION_SECRET);

    await this.oauth.upsert({
      userId: user.id,
      providerAccountId: ghUser.id,
      accessToken: encryptedToken,
      scope: tokenRes.scope ?? null,
    });

    const sessionToken = generateToken();
    const expiresAt = new Date(
      Date.now() + this.env.SESSION_MAX_AGE_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.sessions.create(user.id, sessionToken, expiresAt);

    return { sessionToken, user: toUserProfile(user) };
  }

  async getUserBySessionToken(sessionToken: string): Promise<UserProfile | null> {
    const session = await this.sessions.findByToken(sessionToken);
    if (!session) return null;

    const user = await this.users.findById(session.user_id);
    if (!user) return null;

    return toUserProfile(user);
  }

  async logout(sessionToken: string): Promise<void> {
    await this.sessions.deleteByToken(sessionToken);
  }
}
