import type { UserProfile } from '@osct/shared';

export type DbUser = {
  id: string;
  github_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  email: string | null;
  profile_url: string;
  created_at: Date;
};

export function toUserProfile(row: DbUser): UserProfile {
  return {
    id: row.id,
    githubId: Number(row.github_id),
    username: row.username,
    displayName: row.display_name,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    email: row.email,
    profileUrl: row.profile_url,
    createdAt: row.created_at.toISOString(),
  };
}

export type UpsertUserInput = {
  githubId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  email: string | null;
  profileUrl: string;
};
