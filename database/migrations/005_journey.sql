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
