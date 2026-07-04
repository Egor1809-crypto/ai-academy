-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "phone_normalized" VARCHAR(20),
ADD COLUMN     "purge_after" TIMESTAMP(3),
ADD COLUMN     "revoked_at" TIMESTAMP(3);

-- Backfill: нормализованный телефон (только цифры) для исторических лидов, чтобы
-- индексная дедупликация работала и по существующей базе, а не только для новых.
UPDATE "leads" SET "phone_normalized" = regexp_replace("phone", '\D', '', 'g')
WHERE "phone_normalized" IS NULL;

-- Backfill: срок хранения для существующих лидов (согласие/создание + ~3 года),
-- иначе старые лиды никогда не попадут под удаление ретеншн-джобой.
UPDATE "leads"
SET "purge_after" = COALESCE("consent_at", "created_at") + INTERVAL '3 years'
WHERE "purge_after" IS NULL;

-- CreateTable
CREATE TABLE "login_events" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "email_hash" VARCHAR(16),
    "ip" VARCHAR(64),
    "outcome" VARCHAR(10) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "login_events_user_id_idx" ON "login_events"("user_id");

-- CreateIndex
CREATE INDEX "login_events_created_at_idx" ON "login_events"("created_at");

-- CreateIndex
CREATE INDEX "auth_codes_expires_at_idx" ON "auth_codes"("expires_at");

-- CreateIndex
CREATE INDEX "auth_codes_consumed_at_idx" ON "auth_codes"("consumed_at");

-- CreateIndex
CREATE INDEX "leads_phone_normalized_idx" ON "leads"("phone_normalized");
