BEGIN;

-- PostgreSQL roles and grants for the partner-isolated schema app.
-- This script assumes base tables already exist in schema app and RLS is enabled.
-- All application sessions must set the tenant context before accessing data:
--   SET LOCAL app.current_partner_id = '<partner-uuid>';
--   SET LOCAL app.current_user_id = '<user-uuid>';
--
-- Important security model:
-- 1. These roles are created as NOLOGIN group roles. Grant them to concrete LOGIN roles used by applications.
-- 2. TRUNCATE is explicitly not granted.
-- 3. DROP and ALTER remain unavailable because these roles do not own schema objects.
-- 4. Encrypted-content tables are not directly exposed to app_readonly or app_user.

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_readonly') THEN
        CREATE ROLE app_readonly NOLOGIN;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_user') THEN
        CREATE ROLE app_user NOLOGIN;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_admin') THEN
        CREATE ROLE app_admin NOLOGIN;
    END IF;
END;
$$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_service') THEN
        CREATE ROLE app_service NOLOGIN;
    END IF;
END;
$$;

COMMENT ON ROLE app_readonly IS
'Read-only analytics/dashboard role. SELECT only on approved partner-scoped tables; access still limited by RLS and app.current_partner_id.';

COMMENT ON ROLE app_user IS
'Application end-user role. Can read self-service data, insert RPG events, and update only own profile fields under RLS. No direct access to encrypted-content tables.';

COMMENT ON ROLE app_admin IS
'Privileged application admin role. Full DML on application tables, still bounded by RLS. No ownership, no DDL, no KMS/key-store access.';

COMMENT ON ROLE app_service IS
'Background worker role for asynchronous jobs. Access is limited to partner-scoped event and audit flows under RLS.';

REVOKE ALL ON SCHEMA app FROM PUBLIC;
REVOKE ALL ON SCHEMA app FROM app_readonly;
REVOKE ALL ON SCHEMA app FROM app_user;
REVOKE ALL ON SCHEMA app FROM app_admin;
REVOKE ALL ON SCHEMA app FROM app_service;

GRANT USAGE ON SCHEMA app TO app_readonly;
GRANT USAGE ON SCHEMA app TO app_user;
GRANT USAGE ON SCHEMA app TO app_admin;
GRANT USAGE ON SCHEMA app TO app_service;

REVOKE ALL PRIVILEGES ON ALL TABLES IN SCHEMA app FROM PUBLIC;
REVOKE ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA app FROM PUBLIC;

GRANT EXECUTE ON FUNCTION app.current_partner_id() TO app_readonly, app_user, app_admin, app_service;
GRANT EXECUTE ON FUNCTION app.current_user_id() TO app_readonly, app_user, app_admin, app_service;

-- app_readonly: dashboards and analytics, no access to encrypted-content tables.
GRANT SELECT ON app.partners TO app_readonly;
GRANT SELECT ON app.users TO app_readonly;
GRANT SELECT ON app.rpg_progress TO app_readonly;
GRANT SELECT ON app.rpg_events TO app_readonly;
GRANT SELECT ON app.rpg_config_weights TO app_readonly;
GRANT SELECT ON app.llm_audit_log TO app_readonly;
GRANT SELECT ON app.reputation_log TO app_readonly;

-- app_user: no direct access to encrypted-content tables or audit tables.
GRANT SELECT ON app.partners TO app_user;
GRANT SELECT ON app.users TO app_user;
GRANT SELECT ON app.rpg_progress TO app_user;
GRANT SELECT ON app.rpg_config_weights TO app_user;
GRANT SELECT ON app.reputation_log TO app_user;
GRANT INSERT ON app.rpg_events TO app_user;
GRANT UPDATE (nickname, locale, timezone, last_seen_at) ON app.users TO app_user;

-- app_admin: full data-plane DML except KMS/key tables, which must remain outside this grant set.
GRANT SELECT, INSERT, UPDATE, DELETE ON app.partners TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.users TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.user_personal_data TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.rpg_progress TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.rpg_events TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.rpg_config_weights TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.llm_audit_log TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.reputation_log TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.partner_prompt_profiles TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.dialog_sessions TO app_admin;
GRANT SELECT, INSERT, UPDATE, DELETE ON app.dialog_messages TO app_admin;

-- app_service: asynchronous workers processing partner-scoped event streams and audits.
GRANT SELECT, INSERT ON app.rpg_events TO app_service;
GRANT SELECT ON app.rpg_config_weights TO app_service;
GRANT SELECT ON app.users TO app_service;
GRANT SELECT, UPDATE ON app.rpg_progress TO app_service;
GRANT INSERT ON app.llm_audit_log TO app_service;
GRANT INSERT ON app.reputation_log TO app_service;

-- Explicit deny for encrypted-content tables to low-privilege roles.
REVOKE ALL ON app.user_personal_data FROM app_readonly, app_user, app_service;
REVOKE ALL ON app.partner_prompt_profiles FROM app_readonly, app_user, app_service;
REVOKE ALL ON app.dialog_sessions FROM app_readonly, app_user, app_service;
REVOKE ALL ON app.dialog_messages FROM app_readonly, app_user, app_service;

-- TRUNCATE is intentionally forbidden for all non-superuser application roles.
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA app FROM app_readonly;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA app FROM app_user;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA app FROM app_admin;
REVOKE TRUNCATE ON ALL TABLES IN SCHEMA app FROM app_service;

-- Role-specific RLS hardening for app_user.
-- Base schema policies isolate by partner only. The restrictive policies below additionally ensure
-- that app_user can read or mutate only rows owned by app.current_user_id() where required.

CREATE POLICY users_app_user_self_select_policy ON app.users
    AS RESTRICTIVE
    FOR SELECT
    TO app_user
    USING (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    );

CREATE POLICY users_app_user_self_update_policy ON app.users
    AS RESTRICTIVE
    FOR UPDATE
    TO app_user
    USING (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    )
    WITH CHECK (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    );

CREATE POLICY rpg_progress_app_user_self_select_policy ON app.rpg_progress
    AS RESTRICTIVE
    FOR SELECT
    TO app_user
    USING (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    );

CREATE POLICY reputation_log_app_user_self_select_policy ON app.reputation_log
    AS RESTRICTIVE
    FOR SELECT
    TO app_user
    USING (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    );

CREATE POLICY rpg_events_app_user_self_insert_policy ON app.rpg_events
    AS RESTRICTIVE
    FOR INSERT
    TO app_user
    WITH CHECK (
        partner_id = app.current_partner_id()
        AND user_id = app.current_user_id()
    );

COMMENT ON POLICY users_app_user_self_select_policy ON app.users IS
'Restrictive RLS layer for app_user: user can read only own profile row inside current partner.';

COMMENT ON POLICY users_app_user_self_update_policy ON app.users IS
'Restrictive RLS layer for app_user: user can update only own profile row inside current partner.';

COMMENT ON POLICY rpg_progress_app_user_self_select_policy ON app.rpg_progress IS
'Restrictive RLS layer for app_user: user can read only own RPG progress.';

COMMENT ON POLICY reputation_log_app_user_self_select_policy ON app.reputation_log IS
'Restrictive RLS layer for app_user: user can read only own reputation history.';

COMMENT ON POLICY rpg_events_app_user_self_insert_policy ON app.rpg_events IS
'Restrictive RLS layer for app_user: event inserts are allowed only for current user inside current partner.';

COMMIT;