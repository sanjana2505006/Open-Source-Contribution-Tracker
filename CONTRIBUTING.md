# Contributing to OSCT

Thanks for helping improve Open Source Contribution Tracker.

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- A [GitHub OAuth App](docs/github-oauth.md)

## Setup

```bash
createdb osct
cp .env.example .env
# Fill DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET

npm install
npm run db:migrate
npm run dev
```

- Web: http://localhost:5173  
- API health: http://localhost:4000/api/v1/health  

## Branch naming

- `feat/<short-name>` — new feature  
- `fix/<short-name>` — bug fix  
- `docs/<short-name>` — documentation only  
- `chore/<short-name>` — tooling, deps, formatting  

## Before you open a PR

```bash
npm run typecheck
npm test
npm run lint
```

Optional: `npm run format` if you touched formatting.

## Pull requests

1. Fork (or branch from `main`)
2. Keep the PR focused — one issue per PR when possible
3. Link the GitHub issue (`Fixes #N`)
4. Describe what changed and how you tested it

## Project map (quick)

| Path | What it is |
|------|------------|
| `apps/web` | React UI (Vite) |
| `apps/api` | Express API |
| `packages/shared` | Shared TypeScript types |
| `database/migrations` | SQL migrations |
| `docs/workflows.md` | Feature flowcharts |

## Good first issues

Look for labels **`good first issue`** and **`help wanted`** on the repo issues board.

## Code of conduct (short)

Be respectful. Assume good intent. Prefer small, reviewable PRs.
