-- Нормализация: строковые статусы/роли → enum'ы (data-preserving через USING-каст),
-- + модель Order (покупка тарифа) + ConsentRecord (единый реестр согласий).

-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('new', 'contacted', 'qualified', 'paid', 'rejected', 'lost');
CREATE TYPE "UserRole" AS ENUM ('user', 'admin');
CREATE TYPE "BroadcastStatus" AS ENUM ('pending', 'sending', 'sent', 'failed');
CREATE TYPE "RecipientStatus" AS ENUM ('pending', 'sent', 'failed', 'skipped');
CREATE TYPE "LoginOutcome" AS ENUM ('ok', 'fail');
CREATE TYPE "TariffTier" AS ENUM ('start', 'praktik', 'vnedrenie');
CREATE TYPE "OrderStatus" AS ENUM ('pending', 'paid', 'cancelled', 'refunded');
CREATE TYPE "ConsentType" AS ENUM ('pdn', 'marketing');

-- Convert leads.status (сохраняем данные: 'new'::LeadStatus)
ALTER TABLE "leads" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "leads" ALTER COLUMN "status" TYPE "LeadStatus" USING ("status"::"LeadStatus");
ALTER TABLE "leads" ALTER COLUMN "status" SET DEFAULT 'new';

-- Convert users.role
ALTER TABLE "users" ALTER COLUMN "role" DROP DEFAULT;
ALTER TABLE "users" ALTER COLUMN "role" TYPE "UserRole" USING ("role"::"UserRole");
ALTER TABLE "users" ALTER COLUMN "role" SET DEFAULT 'user';

-- Convert broadcasts.status
ALTER TABLE "broadcasts" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "broadcasts" ALTER COLUMN "status" TYPE "BroadcastStatus" USING ("status"::"BroadcastStatus");
ALTER TABLE "broadcasts" ALTER COLUMN "status" SET DEFAULT 'pending';

-- Convert broadcast_recipients.status (без дефолта)
ALTER TABLE "broadcast_recipients" ALTER COLUMN "status" TYPE "RecipientStatus" USING ("status"::"RecipientStatus");

-- Convert login_events.outcome (без дефолта)
ALTER TABLE "login_events" ALTER COLUMN "outcome" TYPE "LoginOutcome" USING ("outcome"::"LoginOutcome");

-- CreateTable orders
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "tariff" "TariffTier" NOT NULL,
    "amount" INTEGER NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'pending',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable consent_records
CREATE TABLE "consent_records" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER,
    "lead_id" INTEGER,
    "type" "ConsentType" NOT NULL,
    "granted" BOOLEAN NOT NULL DEFAULT true,
    "version" VARCHAR(20),
    "ip" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consent_records_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "orders_user_id_idx" ON "orders"("user_id");
CREATE INDEX "orders_status_idx" ON "orders"("status");
CREATE INDEX "consent_records_user_id_idx" ON "consent_records"("user_id");
CREATE INDEX "consent_records_lead_id_idx" ON "consent_records"("lead_id");
CREATE INDEX "leads_status_idx" ON "leads"("status");
-- broadcasts_status_idx уже существует (Broadcast @@index([status]) был в исходной схеме),
-- а ALTER COLUMN USING сохраняет индекс — поэтому CREATE тут не нужен.

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "consent_records" ADD CONSTRAINT "consent_records_lead_id_fkey" FOREIGN KEY ("lead_id") REFERENCES "leads"("id") ON DELETE SET NULL ON UPDATE CASCADE;
