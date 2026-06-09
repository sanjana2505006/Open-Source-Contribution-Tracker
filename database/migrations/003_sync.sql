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
    state               pull_request_state,
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

CREATE TRIGGER trg_repositories_updated_at
    BEFORE UPDATE ON repositories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_user_repositories_updated_at
    BEFORE UPDATE ON user_repositories FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_contributions_updated_at
    BEFORE UPDATE ON contributions FOR EACH ROW EXECUTE FUNCTION set_updated_at();
