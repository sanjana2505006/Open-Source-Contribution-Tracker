# Folder Structure — Monorepo Layout

Phase 1 will scaffold this structure. Documented here as the Phase 0 contract.

```
open-source-contribution-tracker/
├── README.md
├── package.json                 # Workspace root scripts
├── .gitignore
├── .env.example
│
├── docs/
│   ├── requirements.md
│   ├── architecture.md
│   ├── folder-structure.md
│   └── api-contracts.md         # Added in Phase 3
│
├── database/
│   ├── schema.sql               # Canonical schema reference
│   └── migrations/              # Versioned migrations (Phase 1+)
│
├── packages/
│   └── shared/                  # @osct/shared
│       ├── package.json
│       ├── tsconfig.json
│       └── src/
│           ├── index.ts
│           ├── types/           # User, Repository, Contribution, etc.
│           └── schemas/         # Zod validation schemas
│
├── apps/
│   ├── api/                     # @osct/api — Express backend
│   │   ├── package.json
│   │   ├── tsconfig.json
│   │   └── src/
│   │       ├── index.ts         # Entry point
│   │       ├── app.ts           # Express app factory
│   │       ├── config/          # env, constants
│   │       ├── middleware/      # auth, error handler, validate
│   │       ├── routes/          # Route definitions
│   │       ├── controllers/
│   │       ├── services/
│   │       ├── repositories/
│   │       ├── domain/
│   │       └── infrastructure/
│   │           ├── db/          # Pool, query helpers
│   │           ├── github/      # GitHub API client
│   │           └── auth/        # OAuth, session store
│   │
│   └── web/                     # @osct/web — React frontend
│       ├── package.json
│       ├── vite.config.ts
│       ├── tailwind.config.js
│       ├── index.html
│       └── src/
│           ├── main.tsx
│           ├── app/
│           ├── features/
│           │   ├── auth/
│           │   ├── dashboard/
│           │   ├── journey/
│           │   ├── repositories/
│           │   └── opportunities/
│           ├── components/
│           ├── charts/
│           ├── hooks/
│           ├── lib/
│           └── styles/
│
└── .github/
    ├── ISSUE_TEMPLATE/
    └── workflows/               # CI (lint, test, build) — Phase 1+
```

## Package Naming

| Package | Name | Purpose |
|---------|------|---------|
| Root | `open-source-contribution-tracker` | Workspace orchestration |
| Shared | `@osct/shared` | Types, Zod schemas, constants |
| API | `@osct/api` | Express REST server |
| Web | `@osct/web` | React SPA |

## Module Boundaries

- `apps/web` must not import from `apps/api` source directly
- Both apps depend on `@osct/shared` for contract types
- GitHub API logic lives only in `apps/api/src/infrastructure/github`
- D3 visualization logic lives only in `apps/web/src/charts`
