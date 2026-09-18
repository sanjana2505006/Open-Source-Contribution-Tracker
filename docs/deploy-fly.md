# Deploy OSCT on Fly.io

Keeps the same app shape as Render: one Node process (`npm start`) serving API + built web UI. Postgres stays on **Neon** (copy `DATABASE_URL`).

Goal: avoid Render free-tier cold starts by keeping a small Fly Machine always on (`min_machines_running = 1`).

## 0. Prerequisites

- Fly account: [fly.io/signup](https://fly.io/signup) (GitHub login is fine)
- Neon `DATABASE_URL` (same as Render)
- GitHub OAuth app credentials
- This repo cloned locally

## 1. Install flyctl

```bash
# macOS
brew install flyctl

# or
curl -L https://fly.io/install.sh | sh
```

Log in:

```bash
fly auth login
```

## 2. Create the app (first time only)

From the repo root:

```bash
cd /Users/sanjana/Open-Source-Contribution-Tracker

# If "osct-sanjana" is taken, edit fly.toml `app = '...'` first
fly apps create osct-sanjana
```

Or let Fly allocate a name:

```bash
fly launch --no-deploy --copy-config --name osct-sanjana
```

Use region **bom** (Mumbai) in `fly.toml` unless you prefer another: [Fly regions](https://fly.io/docs/reference/regions/).

## 3. Set secrets (env)

Copy values from Render / `.env`. Do **not** commit secrets.

```bash
fly secrets set \
  DATABASE_URL='postgresql://...' \
  GITHUB_CLIENT_ID='...' \
  GITHUB_CLIENT_SECRET='...' \
  SESSION_SECRET='...' \
  WEB_ORIGIN='https://osct-sanjana.fly.dev' \
  API_ORIGIN='https://osct-sanjana.fly.dev'
```

Optional:

```bash
fly secrets set \
  GROQ_API_KEY='...' \
  AGENT_PROVIDER='groq' \
  AGENT_MODEL='llama-3.3-70b-versatile' \
  RESEND_API_KEY='...' \
  DIGEST_FROM_EMAIL='OSCT <digest@yourdomain.com>' \
  GITHUB_PUBLIC_TOKEN='...' \
  ADMIN_USERNAMES='sanjana2505006' \
  CRON_SECRET='...'
```

Replace `osct-sanjana.fly.dev` with your real hostname from:

```bash
fly status
# or
fly apps list
```

`WEB_ORIGIN` and `API_ORIGIN` must be the **same** public HTTPS URL (API serves the SPA).

## 4. Deploy

```bash
fly deploy
```

Watch logs:

```bash
fly logs
```

Health check:

```bash
curl -sI https://osct-sanjana.fly.dev/api/v1/health
```

## 5. Update GitHub OAuth

1. [GitHub → Developer settings → OAuth Apps](https://github.com/settings/developers)
2. Homepage URL: `https://osct-sanjana.fly.dev`
3. Callback URL: `https://osct-sanjana.fly.dev/api/v1/auth/github/callback`
4. Save

Sign out / sign in again on the new host.

## 6. (Optional) Turn down Render

Once Fly works:

1. Open Render → osct → suspend or delete  
2. Update any links (README, LinkedIn) to the Fly URL  

Neon stays as-is.

## Cost / cold starts

`fly.toml` sets:

- `auto_stop_machines = "off"`
- `min_machines_running = 1`
- `512mb` shared CPU

That keeps the site warm (small bill). To save money and allow sleep (cold starts again):

```toml
auto_stop_machines = 'stop'
min_machines_running = 0
```

Then `fly deploy` again.

## Useful commands

```bash
fly status
fly logs
fly ssh console
fly secrets list
fly deploy
fly apps open
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Health check failing | `fly logs` — often missing `DATABASE_URL` or wrong Neon allowlist (Neon usually allows all) |
| OAuth redirect error | Callback URL must match `API_ORIGIN` exactly |
| App name taken | Change `app` in `fly.toml`, `fly apps create <new-name>`, update secrets origins |
| Out of memory on build | `fly deploy --ha=false` or bump VM; local Docker build to debug |
| Still slow first request | Confirm `min_machines_running = 1` and `auto_stop_machines = "off"` |
