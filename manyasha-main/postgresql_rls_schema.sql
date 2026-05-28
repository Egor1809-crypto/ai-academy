BEGIN;

-- PostgreSQL DDL for partner-isolated RPG platform.
-- Assumptions due to missing source requirements document in workspace:
-- R-01: strict isolation of partner data.
-- R-02: storage of users, RPG progress, and dialog history.
-- S-01: tenant-aware access control with Row Level Security.
-- S-05: protection of prompts and personal data, including pseudonymization.
-- 152-FZ: minimize raw PII, separate ciphertext from operational data, keep public IDs pseudonymous.

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS citext;

CREATE SCHEMA IF NOT EXISTS app;

COMMENT ON SCHEMA app IS 'Application schema with multi-tenant tables protected by RLS.';

CREATE OR REPLACE FUNCTION app.current_partner_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_partner_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.current_user_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
    SELECT NULLIF(current_setting('app.current_user_id', true), '')::uuid
$$;

CREATE OR REPLACE FUNCTION app.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at := now();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION app.current_partner_id() IS
'Returns partner UUID from the application session setting app.current_partner_id. Must be set per transaction.';

COMMENT ON FUNCTION app.current_user_id() IS
'Returns user UUID from the application session setting app.current_user_id. Must be set per transaction.';

CREATE TABLE app.partners (
    partner_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_code text NOT NULL UNIQUE,
    display_name text NOT NULL,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'disabled')),
    settings jsonb NOT NULL DEFAULT '{}'::jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT partners_code_format_chk CHECK (partner_code ~ '^[a-z0-9][a-z0-9_-]{2,63}$')
);

COMMENT ON TABLE app.partners IS
'Partner registry. One partner sees only its own row through RLS.';

CREATE TABLE app.users (
    user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES app.partners(partner_id) ON DELETE RESTRICT,
    user_public_id uuid NOT NULL DEFAULT gen_random_uuid(),
    external_subject text,
    nickname text,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'blocked', 'deleted')),
    locale text NOT NULL DEFAULT 'ru-RU',
    timezone text NOT NULL DEFAULT 'UTC',
    pii_email_hash bytea,
    pii_phone_hash bytea,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    last_seen_at timestamptz,
    deleted_at timestamptz,
    CONSTRAINT users_partner_user_uq UNIQUE (partner_id, user_id),
    CONSTRAINT users_public_id_uq UNIQUE (user_public_id),
    CONSTRAINT users_partner_external_subject_uq UNIQUE NULLS NOT DISTINCT (partner_id, external_subject)
);

COMMENT ON TABLE app.users IS
'Operational user profile without raw PII. Public identifier is pseudonymous. PII hashes support lookup without storing plaintext.';

COMMENT ON COLUMN app.users.user_public_id IS
'Pseudonymous identifier for integrations and analytics; avoids exposing internal user_id and raw personal data.';

COMMENT ON COLUMN app.users.pii_email_hash IS
'152-FZ: store only irreversible hash/HMAC of normalized email for search or deduplication; plaintext email must not be stored here.';

COMMENT ON COLUMN app.users.pii_phone_hash IS
'152-FZ: store only irreversible hash/HMAC of normalized phone for search or deduplication; plaintext phone must not be stored here.';

CREATE TABLE app.user_personal_data (
    user_id uuid PRIMARY KEY,
    partner_id uuid NOT NULL,
    email_enc bytea,
    phone_enc bytea,
    full_name_enc bytea,
    notes_enc bytea,
    encryption_key_id text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT user_personal_data_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE app.user_personal_data IS
'Ciphertext-only storage for personal data. Keep keys outside the database, for example in KMS/HSM.';

COMMENT ON COLUMN app.user_personal_data.email_enc IS
'ENCRYPT: store only ciphertext of email (bytea); application-side envelope encryption required before INSERT/UPDATE.';

COMMENT ON COLUMN app.user_personal_data.phone_enc IS
'ENCRYPT: store only ciphertext of phone number (bytea); application-side envelope encryption required before INSERT/UPDATE.';

COMMENT ON COLUMN app.user_personal_data.full_name_enc IS
'ENCRYPT: store only ciphertext of full name (bytea); application-side envelope encryption required before INSERT/UPDATE.';

COMMENT ON COLUMN app.user_personal_data.notes_enc IS
'ENCRYPT: optional sensitive notes ciphertext; avoid storing unnecessary PII to comply with data minimization.';

COMMENT ON COLUMN app.user_personal_data.encryption_key_id IS
'Identifier of active key version in external KMS/HSM; never store raw keys in database.';

CREATE TABLE app.rpg_progress (
    progress_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    xp bigint NOT NULL DEFAULT 0 CHECK (xp >= 0),
    qi integer NOT NULL DEFAULT 0 CHECK (qi >= 0),
    sp integer NOT NULL DEFAULT 0 CHECK (sp >= 0),
    rp integer NOT NULL DEFAULT 0 CHECK (rp >= 0),
    progression_version bigint NOT NULL DEFAULT 1,
    updated_by_user_id uuid,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rpg_progress_partner_user_uq UNIQUE (partner_id, user_id),
    CONSTRAINT rpg_progress_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE app.rpg_progress IS
'Per-user RPG progression metrics isolated by partner. XP, QI, SP, RP are constrained to non-negative values.';

CREATE TABLE app.rpg_events (
    event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    event_type text NOT NULL CHECK (event_type IN ('XP_GAIN', 'RP_PENALTY')),
    points_delta integer NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rpg_events_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE app.rpg_events IS
'Idempotency-safe RPG event ledger. Each event is uniquely identified by event_id and scoped to one partner.';

COMMENT ON COLUMN app.rpg_events.event_type IS
'RPG event type from Section 12.4 S-25. Allowed values: XP_GAIN, RP_PENALTY.';

COMMENT ON COLUMN app.rpg_events.points_delta IS
'Signed delta applied by event processing. Positive values add points, negative values subtract points.';

CREATE TABLE app.rpg_config_weights (
    partner_id uuid NOT NULL REFERENCES app.partners(partner_id) ON DELETE CASCADE,
    weight_xp numeric(5,2) NOT NULL CHECK (weight_xp >= 0),
    weight_qi numeric(5,2) NOT NULL CHECK (weight_qi >= 0),
    weight_sp numeric(5,2) NOT NULL CHECK (weight_sp >= 0),
    weight_rp numeric(5,2) NOT NULL CHECK (weight_rp >= 0),
    version integer NOT NULL CHECK (version > 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT rpg_config_weights_pk PRIMARY KEY (partner_id, version),
    CONSTRAINT rpg_config_weights_sum_chk CHECK ((weight_xp + weight_qi + weight_sp + weight_rp) = 100.00)
);

COMMENT ON TABLE app.rpg_config_weights IS
'Partner-managed RPG weighting configuration from Section 10.3. The four weights must sum to 100 percent.';

COMMENT ON COLUMN app.rpg_config_weights.version IS
'Monotonic configuration version per partner.';

CREATE TABLE app.llm_audit_log (
    audit_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    "timestamp" timestamptz NOT NULL DEFAULT now(),
    prompt_hash bytea NOT NULL,
    response_len integer NOT NULL CHECK (response_len >= 0),
    model text NOT NULL,
    latency_ms integer NOT NULL CHECK (latency_ms >= 0),
    CONSTRAINT llm_audit_log_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE RESTRICT
);

COMMENT ON TABLE app.llm_audit_log IS
'Audit trail for LLM requests from Section 12.3 S-20. Stores only metadata and prompt hash; prompt plaintext is forbidden.';

COMMENT ON COLUMN app.llm_audit_log.prompt_hash IS
'SHA-256 hash of normalized prompt content for audit correlation. Do not store prompt text in this table.';

COMMENT ON COLUMN app.llm_audit_log."timestamp" IS
'Request timestamp captured for audit and incident investigation.';

CREATE TABLE app.reputation_log (
    reputation_log_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    delta integer NOT NULL,
    reason_code text NOT NULL CHECK (reason_code IN ('DEADLINE_MISSED', 'COMPLAINT')),
    source_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT reputation_log_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE CASCADE
);

COMMENT ON TABLE app.reputation_log IS
'History of RP penalties and adjustments from Section 10.4, linked to partner-scoped users.';

COMMENT ON COLUMN app.reputation_log.reason_code IS
'Reason code for RP change. Allowed values: DEADLINE_MISSED, COMPLAINT.';

COMMENT ON COLUMN app.reputation_log.source_id IS
'External case, ticket, or business object identifier that explains the reputation change.';

CREATE TABLE app.partner_prompt_profiles (
    prompt_profile_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL REFERENCES app.partners(partner_id) ON DELETE CASCADE,
    profile_name text NOT NULL,
    system_prompt_enc bytea NOT NULL,
    safety_prompt_enc bytea,
    tool_prompt_enc bytea,
    encryption_key_id text NOT NULL,
    is_default boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    CONSTRAINT partner_prompt_profiles_name_uq UNIQUE (partner_id, profile_name)
);

COMMENT ON TABLE app.partner_prompt_profiles IS
'Partner-level prompt configuration. Raw prompts are not stored in plaintext.';

COMMENT ON COLUMN app.partner_prompt_profiles.system_prompt_enc IS
'ENCRYPT: system prompt ciphertext.';

COMMENT ON COLUMN app.partner_prompt_profiles.safety_prompt_enc IS
'ENCRYPT: safety prompt ciphertext.';

COMMENT ON COLUMN app.partner_prompt_profiles.tool_prompt_enc IS
'ENCRYPT: tool prompt ciphertext.';

COMMENT ON COLUMN app.partner_prompt_profiles.encryption_key_id IS
'External key identifier for prompt decryption workflow.';

CREATE TABLE app.dialog_sessions (
    session_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    user_id uuid NOT NULL,
    user_public_id_snapshot uuid NOT NULL,
    prompt_profile_id uuid,
    channel text NOT NULL DEFAULT 'chat',
    title text,
    system_prompt_snapshot_enc bytea,
    summary_enc bytea,
    encryption_key_id text,
    started_at timestamptz NOT NULL DEFAULT now(),
    ended_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT dialog_sessions_partner_session_uq UNIQUE (partner_id, session_id),
    CONSTRAINT dialog_sessions_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE RESTRICT,
    CONSTRAINT dialog_sessions_prompt_profile_fk FOREIGN KEY (prompt_profile_id)
        REFERENCES app.partner_prompt_profiles(prompt_profile_id) ON DELETE SET NULL,
    CONSTRAINT dialog_sessions_time_chk CHECK (ended_at IS NULL OR ended_at >= started_at)
);

COMMENT ON TABLE app.dialog_sessions IS
'Conversation/session header. Contains only pseudonymous identifiers plus encrypted prompt/summary snapshots.';

COMMENT ON COLUMN app.dialog_sessions.user_public_id_snapshot IS
'Pseudonymous snapshot for analytics/export; should not contain direct personal data.';

COMMENT ON COLUMN app.dialog_sessions.system_prompt_snapshot_enc IS
'ENCRYPT: ciphertext snapshot of effective system prompt used in the dialog session.';

COMMENT ON COLUMN app.dialog_sessions.summary_enc IS
'ENCRYPT: optional encrypted conversation summary.';

CREATE TABLE app.dialog_messages (
    message_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id uuid NOT NULL,
    session_id uuid NOT NULL,
    user_id uuid NOT NULL,
    seq_no integer NOT NULL CHECK (seq_no > 0),
    role text NOT NULL CHECK (role IN ('system', 'user', 'assistant', 'tool')),
    prompt_text_enc bytea NOT NULL,
    content_sha256 bytea,
    token_count_input integer CHECK (token_count_input IS NULL OR token_count_input >= 0),
    token_count_output integer CHECK (token_count_output IS NULL OR token_count_output >= 0),
    created_at timestamptz NOT NULL DEFAULT now(),
    metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
    CONSTRAINT dialog_messages_session_seq_uq UNIQUE (session_id, seq_no),
    CONSTRAINT dialog_messages_partner_session_fk FOREIGN KEY (partner_id, session_id)
        REFERENCES app.dialog_sessions(partner_id, session_id) ON DELETE CASCADE,
    CONSTRAINT dialog_messages_user_fk FOREIGN KEY (partner_id, user_id)
        REFERENCES app.users(partner_id, user_id) ON DELETE RESTRICT
);

COMMENT ON TABLE app.dialog_messages IS
'Encrypted dialog history. Message body is stored only as ciphertext and linked to partner-scoped sessions.';

COMMENT ON COLUMN app.dialog_messages.prompt_text_enc IS
'ENCRYPT: ciphertext of user prompt, assistant answer, tool payload, or system message.';

COMMENT ON COLUMN app.dialog_messages.content_sha256 IS
'Optional SHA-256 digest of canonical plaintext for integrity or deduplication; do not use as a substitute for encryption.';

CREATE INDEX idx_users_partner_id ON app.users (partner_id);
CREATE INDEX idx_users_public_id ON app.users (user_public_id);
CREATE INDEX idx_user_personal_data_partner_id ON app.user_personal_data (partner_id);
CREATE INDEX idx_rpg_progress_partner_user ON app.rpg_progress (partner_id, user_id);
CREATE UNIQUE INDEX idx_rpg_events_event_id ON app.rpg_events (event_id);
CREATE INDEX idx_rpg_events_partner_user_created ON app.rpg_events (partner_id, user_id, created_at DESC);
CREATE INDEX idx_rpg_config_weights_partner_version ON app.rpg_config_weights (partner_id, version DESC);
CREATE INDEX idx_llm_audit_log_partner_user_ts ON app.llm_audit_log (partner_id, user_id, "timestamp" DESC);
CREATE INDEX idx_llm_audit_log_prompt_hash ON app.llm_audit_log (partner_id, prompt_hash);
CREATE INDEX idx_reputation_log_partner_user_created ON app.reputation_log (partner_id, user_id, created_at DESC);
CREATE INDEX idx_prompt_profiles_partner_id ON app.partner_prompt_profiles (partner_id);
CREATE INDEX idx_dialog_sessions_partner_user ON app.dialog_sessions (partner_id, user_id, started_at DESC);
CREATE INDEX idx_dialog_messages_partner_session_seq ON app.dialog_messages (partner_id, session_id, seq_no);

CREATE TRIGGER trg_partners_set_updated_at
BEFORE UPDATE ON app.partners
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_users_set_updated_at
BEFORE UPDATE ON app.users
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_user_personal_data_set_updated_at
BEFORE UPDATE ON app.user_personal_data
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_rpg_progress_set_updated_at
BEFORE UPDATE ON app.rpg_progress
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_rpg_config_weights_set_updated_at
BEFORE UPDATE ON app.rpg_config_weights
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_partner_prompt_profiles_set_updated_at
BEFORE UPDATE ON app.partner_prompt_profiles
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

CREATE TRIGGER trg_dialog_sessions_set_updated_at
BEFORE UPDATE ON app.dialog_sessions
FOR EACH ROW
EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE app.partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.user_personal_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_config_weights ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.llm_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.reputation_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.partner_prompt_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.dialog_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.dialog_messages ENABLE ROW LEVEL SECURITY;

ALTER TABLE app.partners FORCE ROW LEVEL SECURITY;
ALTER TABLE app.users FORCE ROW LEVEL SECURITY;
ALTER TABLE app.user_personal_data FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_progress FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_events FORCE ROW LEVEL SECURITY;
ALTER TABLE app.rpg_config_weights FORCE ROW LEVEL SECURITY;
ALTER TABLE app.llm_audit_log FORCE ROW LEVEL SECURITY;
ALTER TABLE app.reputation_log FORCE ROW LEVEL SECURITY;
ALTER TABLE app.partner_prompt_profiles FORCE ROW LEVEL SECURITY;
ALTER TABLE app.dialog_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE app.dialog_messages FORCE ROW LEVEL SECURITY;

CREATE POLICY partners_isolation_policy ON app.partners
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY users_isolation_policy ON app.users
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY user_personal_data_isolation_policy ON app.user_personal_data
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY rpg_progress_isolation_policy ON app.rpg_progress
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY rpg_events_isolation_policy ON app.rpg_events
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY rpg_config_weights_isolation_policy ON app.rpg_config_weights
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY llm_audit_log_isolation_policy ON app.llm_audit_log
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY reputation_log_isolation_policy ON app.reputation_log
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY partner_prompt_profiles_isolation_policy ON app.partner_prompt_profiles
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY dialog_sessions_isolation_policy ON app.dialog_sessions
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

CREATE POLICY dialog_messages_isolation_policy ON app.dialog_messages
    USING (partner_id = app.current_partner_id())
    WITH CHECK (partner_id = app.current_partner_id());

COMMENT ON POLICY partners_isolation_policy ON app.partners IS
'RLS policy for partner self-isolation. Application must SET LOCAL app.current_partner_id before accessing data.';

COMMENT ON POLICY users_isolation_policy ON app.users IS
'Users are visible and mutable only inside current partner boundary.';

COMMENT ON POLICY user_personal_data_isolation_policy ON app.user_personal_data IS
'Encrypted PII is accessible only within current partner boundary.';

COMMENT ON POLICY rpg_progress_isolation_policy ON app.rpg_progress IS
'RPG progress rows are isolated by partner.';

COMMENT ON POLICY rpg_events_isolation_policy ON app.rpg_events IS
'RPG event ledger rows are isolated by partner for idempotent processing.';

COMMENT ON POLICY rpg_config_weights_isolation_policy ON app.rpg_config_weights IS
'Partner-specific RPG weighting configuration is isolated by partner.';

COMMENT ON POLICY llm_audit_log_isolation_policy ON app.llm_audit_log IS
'LLM audit metadata is isolated by partner; no prompt plaintext is stored.';

COMMENT ON POLICY reputation_log_isolation_policy ON app.reputation_log IS
'Reputation penalty history is isolated by partner.';

COMMENT ON POLICY partner_prompt_profiles_isolation_policy ON app.partner_prompt_profiles IS
'Prompt profiles are isolated by partner and protected by encryption-at-rest outside plaintext columns.';

COMMENT ON POLICY dialog_sessions_isolation_policy ON app.dialog_sessions IS
'Dialog sessions are isolated by partner.';

COMMENT ON POLICY dialog_messages_isolation_policy ON app.dialog_messages IS
'Dialog message history is isolated by partner.';

-- Example session bootstrap for the application role:
-- SET LOCAL app.current_partner_id = '11111111-1111-1111-1111-111111111111';
-- SET LOCAL app.current_user_id = '22222222-2222-2222-2222-222222222222';

COMMIT;