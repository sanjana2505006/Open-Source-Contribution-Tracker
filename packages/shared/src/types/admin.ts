export type AdminUserRow = {
  id: string;
  username: string;
  displayName: string | null;
  email: string | null;
  avatarUrl: string | null;
  signedUpAt: string;
  loginCount: number;
  lastLoginAt: string | null;
  lastSeenAt: string | null;
  totalTimeSeconds: number;
  activeNow: boolean;
};

export type AdminUserList = {
  users: AdminUserRow[];
  totals: {
    users: number;
    activeNow: number;
    logins: number;
  };
};
