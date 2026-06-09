# Requirements Analysis — Open Source Contribution Tracker

## 1. Problem Statement

Developers who contribute to open source spread their work across many GitHub repositories. GitHub profiles show activity, but they do not provide:

- Aggregated analytics across repositories
- A narrative view of a contributor's journey (first PR, first merge, milestones)
- Language and PR statistics tailored for portfolio building
- Discovery of programs and repositories aligned with their skills

This application centralizes GitHub contribution data, surfaces meaningful insights, and helps users present and grow their open-source presence—especially for GSoC, LFX, and portfolio use cases.

## 2. Stakeholders & Personas

| Persona | Goals | Pain Points |
|---------|-------|-------------|
| **Student (GSoC/LFX)** | Prove sustained OSS activity; find suitable projects | Hard to summarize contributions; unclear where to contribute next |
| **Active Contributor** | Track impact across repos; maintain consistency | Data scattered; no single dashboard |
| **Portfolio Builder** | Share visual stats and journey with recruiters | GitHub profile alone lacks storytelling and analytics |

## 3. Functional Requirements

### FR-1: Authentication & Identity
- Sign in with GitHub OAuth
- Store user profile (username, avatar, bio, public email if available)
- Secure session management; logout support

### FR-2: Repository Synchronization
- Fetch user's contributed repositories from GitHub
- Store repository metadata (name, owner, language, stars, visibility)
- Support manual refresh and background sync (rate-limit aware)

### FR-3: Contribution Synchronization
- Ingest commits, pull requests, issues, and reviews attributable to the user
- Normalize GitHub API payloads into internal models
- Track sync state per user (last synced, errors, partial failures)

### FR-4: Analytics Dashboard
- Summary cards: total PRs, merged PRs, repos contributed to, active streaks (future)
- D3.js charts: contributions over time, PR status breakdown
- Language statistics (lines/commits/PR count by language where data allows)
- Filter by date range and repository

### FR-5: Contribution Journey
- Timeline of milestones: account linked, first PR, first merged PR, Nth contribution
- Chronological event feed with links back to GitHub

### FR-6: Repository Insights
- Per-repo contribution breakdown
- Top repositories by activity
- Repository health signals (activity level, merge rate)

### FR-7: OSS Opportunity Discovery (Phase 7)
- Curated or API-sourced list of programs (GSoC, LFX, Hacktoberfest-style tags)
- Filter by language, difficulty, organization

### FR-8: AI Recommendations (Phase 8)
- Suggest repositories/programs based on contribution history and languages
- Explainable recommendations (why this repo matches)

## 4. Non-Functional Requirements

| Category | Requirement |
|----------|-------------|
| **Performance** | Dashboard loads cached data in < 2s; sync runs asynchronously |
| **Security** | OAuth tokens encrypted at rest; HTTPS only in production; no token in client |
| **Scalability** | Stateless API; DB indexes on user_id and github ids; job queue for sync (later) |
| **Reliability** | Graceful GitHub API rate-limit handling; idempotent sync |
| **Maintainability** | TypeScript end-to-end; layered architecture; shared types package |
| **Accessibility** | WCAG 2.1 AA target for dashboard UI |
| **Observability** | Structured logging; health check endpoint |

## 5. Out of Scope (v1)

- GitLab/Bitbucket support
- Private repository access beyond OAuth scopes user grants
- Real-time webhooks (can be Phase 9+)
- Mobile native apps
- Team/organization dashboards

## 6. GitHub OAuth Scopes (Planned)

| Scope | Purpose |
|-------|---------|
| `read:user` | Profile information |
| `user:email` | Primary email (optional display) |
| `repo` | Read contribution data in private repos user owns (optional; document tradeoff) |

**v1 recommendation:** Start with `read:user` only for public contribution data via unauthenticated or user-token GraphQL/REST where sufficient. Add `repo` only if private repo analytics are required.

## 7. Success Metrics

- User completes OAuth and sees dashboard within 60 seconds
- Sync completes for typical user (< 50 repos) without manual intervention
- Dashboard accurately reflects GitHub public activity (validated against GitHub profile)

## 8. Assumptions & Constraints

- Primary data source is GitHub REST/GraphQL API
- PostgreSQL is the system of record
- Single-tenant per GitHub account (one app user ↔ one GitHub identity)
- Rate limits: 5,000 REST requests/hour with auth token
