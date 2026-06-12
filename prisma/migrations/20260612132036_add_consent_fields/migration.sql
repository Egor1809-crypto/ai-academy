-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "consent_at" TIMESTAMP(3),
ADD COLUMN     "consent_ip" VARCHAR(64),
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "policy_version" VARCHAR(20);

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "consent_at" TIMESTAMP(3),
ADD COLUMN     "consent_version" VARCHAR(20),
ADD COLUMN     "marketing_consent" BOOLEAN NOT NULL DEFAULT false;
