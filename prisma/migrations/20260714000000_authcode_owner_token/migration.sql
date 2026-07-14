-- Bind each Telegram auth code to the browser that initiated /start via an owner
-- token (also set as an httpOnly cookie). /status mints a session only when the
-- cookie matches this column — closing the session-fixation / account-takeover
-- vector where anyone knowing the code could claim the session via a forced GET.
ALTER TABLE "auth_codes" ADD COLUMN "owner_token" VARCHAR(64);
