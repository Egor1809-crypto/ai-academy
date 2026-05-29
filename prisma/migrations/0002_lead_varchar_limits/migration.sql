-- Enforce length limits at the database level (defense-in-depth backstop
-- for the app-layer sanitizeInput caps). Existing rows already fit these
-- bounds because the API has always trimmed inputs before insert.
ALTER TABLE "leads" ALTER COLUMN "name" SET DATA TYPE VARCHAR(100);
ALTER TABLE "leads" ALTER COLUMN "phone" SET DATA TYPE VARCHAR(20);
ALTER TABLE "leads" ALTER COLUMN "email" SET DATA TYPE VARCHAR(200);
ALTER TABLE "leads" ALTER COLUMN "tariff" SET DATA TYPE VARCHAR(50);
ALTER TABLE "leads" ALTER COLUMN "comment" SET DATA TYPE VARCHAR(1000);
ALTER TABLE "leads" ALTER COLUMN "status" SET DATA TYPE VARCHAR(20);
