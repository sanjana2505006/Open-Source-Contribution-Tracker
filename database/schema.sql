-- Open Source Contribution Tracker — Canonical Database Schema (Phase 0)
-- PostgreSQL 15+
-- Migrations will be generated from this reference in Phase 1.

-- Extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "citext";

-- ---------------------------------------------------------------------------
-- Users & Authentication
-- ---------------------------------------------------------------------------

CREATE TABLE users (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id       BIGINT NOT NULL UNIQUE,
    username        CITEXT NOT NULL UNIQUE,
    display_name    VARCHAR(255),
    avatar_url      TEXT,
    bio             TEXT,
    email           CITEXT,
    profile_url     TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE oauth_accounts (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider            VARCHAR(50) NOT NULL DEFAULT 'github',
    provider_account_id BIGINT NOT NULL,
    access_token        TEXT NOT NULL,          -- encrypted at application layer
    refresh_token       TEXT,
    token_expires_at    TIMESTAMPTZ,
    scope               TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (provider, provider_account_id)
);

CREATE INDEX idx_oauth_accounts_user_id ON oauth_accounts(user_id);

CREATE TABLE sessions (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    session_token   TEXT NOT NULL UNIQUE,
    expires_at      TIMESTAMPTZ NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sessions_user_id ON sessions(user_id);
CREATE INDEX idx_sessions_expires_at ON sessions(expires_at);

-- ---------------------------------------------------------------------------
-- Sync Jobs
-- ---------------------------------------------------------------------------

CREATE TYPE sync_job_status AS ENUM (
    'pending',
    'running',
    'completed',
    'failed',
    'partial'
);

CREATE TABLE sync_jobs (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status              sync_job_status NOT NULL DEFAULT 'pending',
    started_at          TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    repos_synced        INTEGER NOT NULL DEFAULT 0,
    repos_failed        INTEGER NOT NULL DEFAULT 0,
    error_message       TEXT,
    rate_limit_reset_at TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_jobs_user_id_created ON sync_jobs(user_id, created_at DESC);

-- ---------------------------------------------------------------------------
-- Repositories
-- ---------------------------------------------------------------------------

CREATE TABLE repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_id       BIGINT NOT NULL UNIQUE,
    owner_login     CITEXT NOT NULL,
    name            CITEXT NOT NULL,
    full_name       CITEXT NOT NULL UNIQUE,
    description     TEXT,
    primary_language VARCHAR(100),
    stargazers_count INTEGER NOT NULL DEFAULT 0,
    is_fork         BOOLEAN NOT NULL DEFAULT FALSE,
    is_private      BOOLEAN NOT NULL DEFAULT FALSE,
    html_url        TEXT NOT NULL,
    default_branch  VARCHAR(255),
    last_pushed_at  TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_repositories_owner_name ON repositories(owner_login, name);
CREATE INDEX idx_repositories_primary_language ON repositories(primary_language);

-- User ↔ Repository contribution link
CREATE TABLE user_repositories (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id   UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    first_contributed_at TIMESTAMPTZ,
    last_contributed_at  TIMESTAMPTZ,
    contribution_count   INTEGER NOT NULL DEFAULT 0,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, repository_id)
);

CREATE INDEX idx_user_repositories_user_id ON user_repositories(user_id);

-- ---------------------------------------------------------------------------
-- Contributions
-- ---------------------------------------------------------------------------

CREATE TYPE contribution_type AS ENUM (
    'commit',
    'pull_request',
    'issue',
    'review',
    'comment'
);

CREATE TYPE pull_request_state AS ENUM (
    'open',
    'closed',
    'merged'
);

CREATE TABLE contributions (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    repository_id       UUID NOT NULL REFERENCES repositories(id) ON DELETE CASCADE,
    github_id           BIGINT NOT NULL,
    type                contribution_type NOT NULL,
    title               TEXT,
    state               pull_request_state,       -- NULL for non-PR types
    is_merged           BOOLEAN,
    additions           INTEGER,
    deletions           INTEGER,
    changed_files       INTEGER,
    occurred_at         TIMESTAMPTZ NOT NULL,
    html_url            TEXT NOT NULL,
    raw_metadata        JSONB,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, type, github_id)
);

CREATE INDEX idx_contributions_user_occurred ON contributions(user_id, occurred_at DESC);
CREATE INDEX idx_contributions_user_type ON contributions(user_id, type);
CREATE INDEX idx_contributions_repository_id ON contributions(repository_id);

-- ---------------------------------------------------------------------------
-- Journey Milestones
-- ---------------------------------------------------------------------------

CREATE TYPE milestone_type AS ENUM (
    'account_linked',
    'first_contribution',
    'first_pull_request',
    'first_merged_pr',
    'tenth_pr',
    'hundredth_contribution',
    'custom'
);

CREATE TABLE milestones (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type            milestone_type NOT NULL,
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    occurred_at     TIMESTAMPTZ NOT NULL,
    contribution_id UUID REFERENCES contributions(id) ON DELETE SET NULL,
    repository_id   UUID REFERENCES repositories(id) ON DELETE SET NULL,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, type)
);

CREATE INDEX idx_milestones_user_occurred ON milestones(user_id, occurred_at ASC);

-- ---------------------------------------------------------------------------
-- Language Statistics (materialized aggregates, refreshed on sync)
-- ---------------------------------------------------------------------------

CREATE TABLE language_stats (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    language        VARCHAR(100) NOT NULL,
    contribution_count INTEGER NOT NULL DEFAULT 0,
    pull_request_count INTEGER NOT NULL DEFAULT 0,
    repository_count   INTEGER NOT NULL DEFAULT 0,
    last_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, language)
);

CREATE INDEX idx_language_stats_user_id ON language_stats(user_id);

-- ---------------------------------------------------------------------------
-- OSS Opportunities (Phase 7)
-- ---------------------------------------------------------------------------

CREATE TYPE opportunity_program AS ENUM (
    'gsoc',
    'lfx',
    'hacktoberfest',
    'good_first_issue',
    'other'
);

CREATE TABLE opportunities (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    program         opportunity_program NOT NULL,
    title           VARCHAR(500) NOT NULL,
    organization    VARCHAR(255),
    repository_id   UUID REFERENCES repositories(id) ON DELETE SET NULL,
    url             TEXT NOT NULL,
    languages       TEXT[],
    difficulty      VARCHAR(50),
    is_active       BOOLEAN NOT NULL DEFAULT TRUE,
    metadata        JSONB,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_opportunities_program ON opportunities(program);
CREATE INDEX idx_opportunities_languages ON opportunities USING GIN(languages);

-- ---------------------------------------------------------------------------
-- AI Recommendations (Phase 8)
-- ---------------------------------------------------------------------------

CREATE TABLE recommendations (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    opportunity_id  UUID REFERENCES opportunities(id) ON DELETE CASCADE,
    repository_id   UUID REFERENCES repositories(id) ON DELETE CASCADE,
    score           NUMERIC(5, 4) NOT NULL,
    reasoning       TEXT NOT NULL,
    model_version   VARCHAR(100),
    is_dismissed    BOOLEAN NOT NULL DEFAULT FALSE,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (opportunity_id IS NOT NULL OR repository_id IS NOT NULL)
);

CREATE INDEX idx_recommendations_user_score ON recommendations(user_id, score DESC)
    WHERE is_dismissed = FALSE;

-- ---------------------------------------------------------------------------
-- Updated-at trigger helper
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_oauth_accounts_updated_at
    BEFORE UPDATE ON oauth_accounts FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_repositories_updated_at
    BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_repositories_updated_at
    BEFORE UPDATE ON user_repositories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contributions_updated_at
    BEFORE UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_opportunities_updated_at
    BEFORE UPDATE ON opportunities FOR EACH ROW EXECUTE FUNCTION set_updated_at();
