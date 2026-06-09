# Open Source Contribution Tracker

Track and analyze your GitHub open-source contributions. Built for GSoC/LFX prep, active contributors, and portfolio building.

## Stack

- **Frontend:** React, TypeScript, Tailwind CSS, D3.js (later phases)
- **Backend:** Node.js, Express, TypeScript
- **Database:** PostgreSQL
- **Auth:** GitHub OAuth

## Repo layout

```
apps/api/          Express REST API
apps/web/          React SPA (Vite)
packages/shared/   Shared TypeScript types
database/          Schema reference + SQL migrations
docs/              Architecture and requirements
```

## Prerequisites

- Node.js 20+
- PostgreSQL 15+
- GitHub OAuth App ([setup guide](./docs/github-oauth.md))

Create the database:

```bash
createdb osct
```

## Setup

```bash
cp .env.example .env
```

Fill in `.env`: `DATABASE_URL`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `SESSION_SECRET` (see [docs/github-oauth.md](./docs/github-oauth.md)).

```bash
npm install
npm run db:migrate
npm run dev
```

- Web: http://localhost:5173
- API: http://localhost:4000/api/v1/health

Run API and web separately if you prefer:

```bash
npm run dev:api   # port 4000
npm run dev:web   # port 5173, proxies /api to the API
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start API + web |
| `npm run dev:api` | API only |
| `npm run dev:web` | Web only |
| `npm run build` | Build all packages |
| `npm run typecheck` | Typecheck all workspaces |
| `npm run db:migrate` | Apply pending SQL migrations |

## Development phases

| Phase | Status | Focus |
|-------|--------|-------|
| 0 | done | Planning, schema design |
| 1 | done | Monorepo, Express, React, Postgres, Tailwind |
| 2 | done | GitHub OAuth, sessions, user profile |
| 3 | next | GitHub sync |
| 4 | | Analytics dashboard |
| 5 | | Contribution journey |
| 6 | | Repository insights |
| 7 | | OSS discovery |
| 8 | | AI recommendations |

See [docs/architecture.md](./docs/architecture.md) for system design.

## License

MIT
