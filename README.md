# OSCT

I got tired of opening ten different repos just to figure out what I was working on. GitHub shows your green squares and your profile, but it doesn't give you a single place to see your open PRs across projects, issues you commented on hoping someone would assign you, or how your activity actually looked last month.

So I built this.

**OSCT** (Open Source Contribution Tracker) is a small dashboard that connects to your GitHub account, syncs your contribution data, and puts the useful stuff in one UI.

Live: [osct.onrender.com](https://osct.onrender.com)

## What you can do with it

Sign in with GitHub, hit sync once, and you get:

- an overview with PR / issue / repo / commit counts
- a cross-repo PR inbox (filter by open, merged, closed, or by repo)
- a **My Issues** page — assigned, commented, and opened issues
- a contribution heatmap (same idea as the one on your GitHub profile, with hover counts)
- charts for monthly activity, PR status, and languages
- a journey timeline for milestones like first PR and first merge
- **Explore** to look up another public GitHub username and see their stats

There's dark mode too, because obviously.

## How it's built

Monorepo with npm workspaces.

| part | tech |
|------|------|
| frontend | React, TypeScript, Vite, Tailwind |
| backend | Express, TypeScript |
| database | PostgreSQL |
| auth | GitHub OAuth |

```
apps/api/          API server (also serves the built frontend in production)
apps/web/          React app
packages/shared/   shared types between api and web
database/          SQL migrations
```

GitHub data comes from a mix of the REST API and GraphQL — PRs and the heatmap through GraphQL, issues through search, commits from the contribution graph. Sync runs in the background after you click the button on the overview page.

## Run it locally

You'll need Node 20+, Postgres, and a [GitHub OAuth app](docs/github-oauth.md).

```bash
createdb osct

cp .env.example .env
# fill in DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET

npm install
npm run db:migrate
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). API health check is at `http://localhost:4000/api/v1/health`.

To run them separately:

```bash
npm run dev:api   # :4000
npm run dev:web   # :5173, proxies /api to the backend
```

## Deploy

I'm running it on [Render](https://render.com) with Postgres on [Neon](https://neon.tech). The API serves the Vite build in production, so it's one service:

```bash
npm run build
npm start
```

Set `NODE_ENV=production`, `DATABASE_URL`, OAuth credentials, `SESSION_SECRET`, and point both `WEB_ORIGIN` and `API_ORIGIN` at your public URL. Details in [docs/github-oauth.md](docs/github-oauth.md) for the callback URL.

There's a `render.yaml` in the repo if you want to deploy from that.

## Scripts

| command | what it does |
|---------|----------------|
| `npm run dev` | api + web together |
| `npm run build` | build everything |
| `npm run start` | production api (after build) |
| `npm run db:migrate` | run pending migrations |
| `npm run typecheck` | typecheck all packages |

## Notes

- First sync can take a minute if you have a lot of repos. It pulls PRs, repos, issues, and commit history.
- Issue tracking needs a fresh sync after pulling new code — older data won't have issues in it.
- The heatmap reads live from GitHub when you're signed in; it doesn't need a sync.

More design notes in `docs/` if you're curious, but the above is enough to get running.

## License

MIT
