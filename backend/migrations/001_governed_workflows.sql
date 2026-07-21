BEGIN;
CREATE TABLE IF NOT EXISTS governed_cases (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL, workflow_type TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','submitted','approved','rejected')),
 version INTEGER NOT NULL DEFAULT 1, input JSONB NOT NULL, result JSONB NOT NULL,
 assumptions JSONB NOT NULL DEFAULT '[]'::jsonb, uncertainty JSONB NOT NULL DEFAULT '{}'::jsonb,
 provenance JSONB NOT NULL DEFAULT '[]'::jsonb, created_by TEXT NOT NULL, approved_by TEXT,
 approval_note TEXT, idempotency_key TEXT NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (tenant_id,idempotency_key)
);
CREATE TABLE IF NOT EXISTS governed_case_events (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL,
 case_id BIGINT NOT NULL REFERENCES governed_cases(id) ON DELETE CASCADE,
 actor_id TEXT NOT NULL, event_type TEXT NOT NULL, details JSONB NOT NULL DEFAULT '{}'::jsonb,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS integration_outbox (
 id BIGSERIAL PRIMARY KEY, tenant_id TEXT NOT NULL,
 case_id BIGINT REFERENCES governed_cases(id) ON DELETE CASCADE,
 provider TEXT NOT NULL, operation TEXT NOT NULL, payload JSONB NOT NULL,
 status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued','processing','delivered','failed','dead_letter')),
 attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, idempotency_key TEXT NOT NULL,
 next_attempt_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(), UNIQUE (tenant_id,provider,idempotency_key)
);
CREATE INDEX IF NOT EXISTS governed_cases_tenant_status_idx ON governed_cases(tenant_id,status,updated_at DESC);
CREATE INDEX IF NOT EXISTS governed_events_case_idx ON governed_case_events(tenant_id,case_id,created_at);
CREATE INDEX IF NOT EXISTS integration_outbox_ready_idx ON integration_outbox(status,next_attempt_at);
COMMIT;
