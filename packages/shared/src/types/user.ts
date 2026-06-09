export type UserProfile = {
  id: string;
  githubId: number;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  email: string | null;
  profileUrl: string;
  createdAt: string;
};
