# Feature Plan — Phased Delivery

Features are mapped to roadmap phases. Each phase produces a shippable increment.

## Phase Overview

| Phase | Theme | User-Visible Outcome |
|-------|-------|----------------------|
| **0** | Planning | Documented architecture, schema, README |
| **1** | Foundation | App runs locally; health check; empty dashboard shell |
| **2** | Auth | Sign in with GitHub; profile page |
| **3** | Sync | Repos and contributions imported from GitHub |
| **4** | Analytics | Charts and KPI dashboard |
| **5** | Journey | Milestone timeline |
| **6** | Repo Insights | Per-repository drill-down |
| **7** | Discovery | Browse OSS opportunities |
| **8** | AI | Personalized recommendations |

## Feature Breakdown by Phase

### Phase 1 — Foundation
- [ ] Monorepo with `apps/api`, `apps/web`, `packages/shared`
- [ ] Express server with `/health` and global error handler
- [ ] PostgreSQL connection pool + migration runner
- [ ] React app with routing and layout shell
- [ ] Tailwind configured with design tokens
- [ ] `.env.example` with documented variables

### Phase 2 — Authentication
- [ ] GitHub OAuth app registration docs
- [ ] OAuth login/logout flow
- [ ] Session cookie management
- [ ] `users` + `oauth_accounts` + `sessions` tables migrated
- [ ] Protected routes on API and frontend
- [ ] User profile header component

### Phase 3 — GitHub Sync
- [ ] GitHub API client with rate-limit handling
- [ ] Sync job orchestration
- [ ] Repository upsert logic
- [ ] Contribution ingestion (PRs, commits where available)
- [ ] Sync status UI with progress indicator
- [ ] Manual "Refresh data" action

### Phase 4 — Analytics Dashboard
- [ ] Summary KPI cards
- [ ] Contribution activity chart (D3 time series)
- [ ] PR status pie/bar chart
- [ ] Language breakdown chart
- [ ] Date range filter

### Phase 5 — Contribution Journey
- [ ] Milestone detection service
- [ ] Timeline UI component
- [ ] First PR / first merged PR highlights
- [ ] Link events to GitHub

### Phase 6 — Repository Insights
- [ ] Repository list with activity ranking
- [ ] Single repository detail page
- [ ] Contribution breakdown per repo
- [ ] Merge rate and activity indicators

### Phase 7 — OSS Discovery
- [ ] Opportunities data model and seed/import
- [ ] Browse and filter UI (program, language)
- [ ] External links to apply/contribute

### Phase 8 — AI Recommendations
- [ ] Recommendation engine integration
- [ ] Score + reasoning display
- [ ] Dismiss/save feedback loop

## MVP Definition (Phases 1–4)

Minimum viable product for early users:

1. GitHub login
2. One-click sync
3. Dashboard with contribution charts and language stats

Phases 5–8 are differentiators for GSoC/LFX audience.

## Priority Matrix

| Feature | Impact | Effort | Phase |
|---------|--------|--------|-------|
| GitHub OAuth | High | Medium | 2 |
| Contribution sync | High | High | 3 |
| Activity chart | High | Medium | 4 |
| Journey timeline | Medium | Medium | 5 |
| Repo insights | Medium | Low | 6 |
| Opportunity discovery | Medium | Medium | 7 |
| AI recommendations | Low (v1) | High | 8 |
