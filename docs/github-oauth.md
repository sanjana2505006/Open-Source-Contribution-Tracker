# GitHub OAuth setup

1. Open [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
2. **New OAuth App**
   - Application name: `OSCT` (or anything)
   - Homepage URL: `http://localhost:5173`
   - Authorization callback URL: `http://localhost:4000/api/v1/auth/github/callback`
3. Copy the **Client ID**. Generate a **Client secret**.
4. Add them to `.env`:

```bash
GITHUB_CLIENT_ID=your_client_id
GITHUB_CLIENT_SECRET=your_client_secret
SESSION_SECRET=$(openssl rand -base64 32)
```

5. Run migrations if you haven't since pulling this phase:

```bash
npm run db:migrate
```

6. Start the app and use **Sign in with GitHub** in the sidebar.

## Production

- Set `API_ORIGIN` and `WEB_ORIGIN` to your deployed URLs.
- Register the production callback: `https://api.yourdomain.com/api/v1/auth/github/callback`
- Use a strong `SESSION_SECRET` from your host's secret manager.

## Scopes

The app requests `read:user`, `user:email`, and `public_repo` — profile data plus public repository and contribution access.

After updating scopes, **sign out and sign in again**, then run **Sync from GitHub** to pull all PRs and contributed repos (including ones you never cloned locally).
