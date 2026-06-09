# Open Source Contribution Tracker

A full-stack web application that helps developers **track, analyze, and showcase** their open-source contributions across GitHub repositories.

Built for students preparing for **GSoC/LFX**, active contributors, and developers building an **OSS portfolio**.

---

## Features (Roadmap)

| Status | Feature |
|--------|---------|
| Planned | GitHub OAuth authentication |
| Planned | Repository & contribution synchronization |
| Planned | Analytics dashboard with D3.js visualizations |
| Planned | Language & pull request statistics |
| Planned | Contribution journey timeline & milestones |
| Planned | Per-repository insights |
| Planned | OSS opportunity discovery |
| Planned | AI-powered recommendations |

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, TypeScript, Tailwind CSS, D3.js |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL |
| Auth | GitHub OAuth |
| API | REST |

---

## Architecture

Monorepo layout with shared TypeScript types:

```
apps/
  api/     → Express REST API
  web/     → React SPA (Vite)
packages/
  shared/  → Shared types & validation schemas
database/
  schema.sql, migrations/
docs/
  requirements, architecture, feature plan
```

See [docs/architecture.md](./docs/architecture.md) for system design details.

---

## Getting Started

> **Note:** Application code begins in Phase 1. This repository currently contains Phase 0 planning artifacts only.

### Prerequisites (for upcoming phases)

- Node.js 20+
- PostgreSQL 15+
- GitHub OAuth App ([create one here](https://github.com/settings/developers))

### Planned Setup (Phase 1+)

```bash
# Clone the repository
git clone https://github.com/<your-org>/open-source-contribution-tracker.git
cd open-source-contribution-tracker

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env with database URL and GitHub OAuth credentials

# Run database migrations
npm run db:migrate

# Start development servers
npm run dev
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Requirements](./docs/requirements.md) | Functional & non-functional requirements |
| [Architecture](./docs/architecture.md) | System design, API outline, security model |
| [Feature Plan](./docs/feature-plan.md) | Phased delivery breakdown |
| [Folder Structure](./docs/folder-structure.md) | Monorepo layout contract |
| [Database Schema](./database/schema.sql) | PostgreSQL canonical schema |

---

## Development Phases

Development proceeds in incremental phases (0–8). Each phase is a reviewable unit with its own commit history.

| Phase | Focus |
|-------|-------|
| 0 | Requirements, architecture, schema *(current)* |
| 1 | Monorepo setup, Express, React, PostgreSQL, Tailwind |
| 2 | GitHub OAuth & user profiles |
| 3 | GitHub API sync |
| 4 | Analytics dashboard |
| 5 | Contribution journey |
| 6 | Repository insights |
| 7 | OSS opportunity discovery |
| 8 | AI recommendations |

---

## Contributing

Contributions are welcome. Please open an issue before starting significant work. Development follows the phased roadmap above.

---

## License

MIT *(to be added in Phase 1)*
