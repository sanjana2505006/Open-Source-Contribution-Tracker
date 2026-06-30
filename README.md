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

## Project structure

```
OSCT/
│
├── apps/
│   │
│   ├── api/                          # @osct/api — Express REST API
│   │   └── src/
│   │       ├── index.ts              #     Server entry point
│   │       ├── app.ts                #     Express app, route wiring, prod static serve
│   │       │
│   │       ├── config/               #     Environment & boot config
│   │       │   ├── env.ts            #         Zod-validated env vars
│   │       │   └── dotenv.ts         #         .env loader
│   │       │
│   │       ├── routes/               #     HTTP route handlers
│   │       │   ├── auth.ts           #         GitHub OAuth login / callback / logout
│   │       │   ├── sync.ts           #         Trigger & status for GitHub sync jobs
│   │       │   ├── repositories.ts   #         User repo list & per-repo stats
│   │       │   ├── pullRequests.ts   #         Cross-repo PR inbox + AI PR check
│   │       │   ├── issues.ts         #         Assigned / commented / opened issues + AI check
│   │       │   ├── analytics.ts      #         Charts data + contribution heatmap
│   │       │   ├── journey.ts        #         Milestone timeline (first PR, first merge, …)
│   │       │   ├── explore.ts        #         Look up another GitHub user's public profile
│   │       │   ├── public.ts         #         Public portfolio pages (no auth)
│   │       │   ├── recommendations.ts#         Good-first-issue feed (Discover)
│   │       │   ├── agent.ts          #         AI mentor chat + tool actions
│   │       │   ├── digest.ts         #         Weekly digest email + “plan my week”
│   │       │   ├── feedback.ts       #         In-app feedback submissions
│   │       │   ├── admin.ts          #         Admin-only user & feedback views
│   │       │   └── health.ts         #         `/api/v1/health` + DB check
│   │       │
│   │       ├── services/             #     Business logic
│   │       │   ├── authService.ts    #         Sessions, OAuth token storage
│   │       │   ├── syncService.ts    #         Pull PRs, repos, issues, commits from GitHub
│   │       │   ├── analyticsService.ts#        Timeline, PR stats, language breakdown
│   │       │   ├── heatmapService.ts #         Contribution calendar (GitHub-style)
│   │       │   ├── journeyService.ts #         Milestone detection & ordering
│   │       │   ├── exploreService.ts #         Public contributor profile lookup
│   │       │   ├── goodFirstIssueService.ts #  GFI recommendations for Discover
│   │       │   ├── agentService.ts   #         LLM mentor orchestration
│   │       │   ├── agentTools.ts     #         GitHub tools the agent can call
│   │       │   ├── agentActionParser.ts #      Parse agent-suggested git/PR actions
│   │       │   ├── prAiDetectionService.ts  # Heuristic “was this PR AI-written?” check
│   │       │   ├── issueAiDetectionService.ts # Same for issues
│   │       │   ├── digestService.ts  #         Weekly summary emails
│   │       │   └── portfolioHighlightsService.ts # Public portfolio highlights
│   │       │
│   │       ├── repositories/         #     PostgreSQL data access
│   │       │   ├── contributionRepository.ts
│   │       │   ├── repositoryRepository.ts
│   │       │   ├── analyticsRepository.ts
│   │       │   ├── oauthRepository.ts
│   │       │   ├── sessionRepository.ts
│   │       │   ├── syncJobRepository.ts
│   │       │   ├── milestoneRepository.ts
│   │       │   ├── agentRepository.ts
│   │       │   ├── digestRepository.ts
│   │       │   └── …                 #         watchlist, feedback, user activity, cache
│   │       │
│   │       ├── middleware/           #     Express middleware
│   │       │   ├── auth.ts           #         Session attach + requireAuth
│   │       │   ├── admin.ts          #         Admin gate
│   │       │   ├── activity.ts       #         Last-seen tracking
│   │       │   └── errorHandler.ts   #         Consistent API error responses
│   │       │
│   │       ├── infrastructure/       #     External integrations
│   │       │   ├── db/               #         pg pool, SQL migrations runner
│   │       │   ├── github/           #         REST + GraphQL GitHub clients
│   │       │   ├── llm/              #         Groq / OpenAI-compatible agent clients
│   │       │   ├── auth/             #         Token encryption (AES-256-GCM)
│   │       │   └── email/            #         Resend digest emails
│   │       │
│   │       ├── lib/                  #     Small shared server helpers
│   │       └── domain/               #     Core domain types (user, etc.)
│   │
│   └── web/                          # @osct/web — React SPA (Vite)
│       └── src/
│           ├── main.tsx              #     React entry
│           ├── app/                  #     App shell & providers
│           │   ├── App.tsx           #         Routes (Overview, Discover, Issues, …)
│           │   ├── Layout.tsx        #         Sidebar + main content layout
│           │   ├── AuthProvider.tsx  #         GitHub sign-in state
│           │   └── ThemeProvider.tsx #         Dark / light mode
│           │
│           ├── pages/                #     Top-level route pages
│           │   ├── OverviewPage.tsx  #         Dashboard, sync, stats, heatmap
│           │   ├── DiscoverPage.tsx  #         Good-first issues + “Guide me” mentorship
│           │   ├── IssuesPage.tsx    #         My assigned / commented / opened issues
│           │   ├── RepositoriesPage.tsx#       All repos you contribute to
│           │   ├── RepoPage.tsx      #         Single-repo drill-down
│           │   ├── JourneyPage.tsx   #         Contribution milestone timeline
│           │   ├── ExplorePage.tsx   #         Look up another GitHub user
│           │   ├── PortfolioPage.tsx #         Public shareable portfolio
│           │   ├── DigestPage.tsx    #         Weekly digest + plan my week
│           │   ├── AdminPage.tsx     #         Admin panel
│           │   └── …                 #         Privacy, Security, Feedback
│           │
│           ├── components/           #     Reusable UI
│           │   ├── agent/            #         AI mentor panel, messages, action cards
│           │   ├── hero/             #         Landing / dashboard hero animations
│           │   ├── PullRequestTable.tsx
│           │   ├── IssueTable.tsx
│           │   ├── ContributionHeatmap.tsx
│           │   ├── AnalyticsPanel.tsx
│           │   ├── JourneyTimeline.tsx
│           │   ├── AppHeader.tsx
│           │   └── …                 #         sync controls, share bars, empty states
│           │
│           ├── charts/               #     D3 / SVG visualizations
│           │   ├── ActivityChart.tsx
│           │   ├── PullRequestChart.tsx
│           │   └── LanguageChart.tsx
│           │
│           ├── lib/                  #     Client API clients & helpers
│           │   ├── api.ts            #         Core REST client (PRs, repos, analytics)
│           │   ├── agentApi.ts       #         Agent chat endpoints
│           │   ├── recommendationsApi.ts #     Discover / good-first issues
│           │   ├── issueMentorship.ts#         Beginner mentorship prompts
│           │   ├── digestPlan.ts     #         “Plan my week” agent prompt
│           │   ├── exploreApi.ts
│           │   └── …                 #         pr/issue AI check, portfolio, share helpers
│           │
│           ├── hooks/                #     React hooks (page meta, etc.)
│           └── styles/               #     Global CSS + Tailwind theme tokens
│               └── globals.css
│
├── packages/
│   └── shared/                       # @osct/shared — types shared by api + web
│       └── src/
│           ├── index.ts              #     Re-exports all public types
│           └── types/                #     API contract types
│               ├── user.ts
│               ├── contributions.ts
│               ├── analytics.ts
│               ├── issues.ts
│               ├── agent.ts
│               ├── recommendations.ts#     Good-first-issue feed types
│               ├── journey.ts
│               ├── digest.ts
│               └── …                 #         heatmap, portfolio, pr/issue AI check, …
│
├── database/
│   ├── schema.sql                    # Canonical schema reference
│   └── migrations/                   # Versioned SQL migrations (auth, sync, agent, …)
│
├── docs/                             # Design & setup notes
│   ├── architecture.md
│   ├── github-oauth.md
│   ├── agent-integration.md
│   └── requirements.md
│
├── package.json                      # Workspace root scripts
├── tsconfig.base.json
├── render.yaml                       # Render.com deploy blueprint
├── .env.example
└── LICENSE
```

**Module boundaries**

- `apps/web` never imports `apps/api` source — both talk through REST + `@osct/shared` types
- GitHub API calls live only in `apps/api/src/infrastructure/github`
- Charts / D3 live only in `apps/web/src/charts`
- LLM / agent logic lives in `apps/api/src/services` + `infrastructure/llm`

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
