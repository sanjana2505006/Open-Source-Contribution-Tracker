CREATE TABLE contributor_cache (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    github_username CITEXT NOT NULL UNIQUE,
    github_id       BIGINT,
    display_name    VARCHAR(255),
    avatar_url      TEXT,
    profile_url     TEXT NOT NULL,
    stats           JSONB NOT NULL DEFAULT '{}',
    repositories    JSONB NOT NULL DEFAULT '[]',
    analytics       JSONB NOT NULL DEFAULT '{}',
    synced_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_contributor_cache_username ON contributor_cache(github_username);

CREATE TABLE user_watchlist (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    contributor_cache_id  UUID NOT NULL REFERENCES contributor_cache(id) ON DELETE CASCADE,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, contributor_cache_id)
);

CREATE INDEX idx_user_watchlist_user_id ON user_watchlist(user_id);
