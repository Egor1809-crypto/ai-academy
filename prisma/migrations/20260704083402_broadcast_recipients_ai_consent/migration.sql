-- CreateTable
CREATE TABLE "broadcast_recipients" (
    "id" SERIAL NOT NULL,
    "broadcast_id" INTEGER NOT NULL,
    "telegram_id" VARCHAR(32),
    "user_id" INTEGER,
    "status" VARCHAR(20) NOT NULL,
    "delivered_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "broadcast_recipients_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "broadcast_recipients_broadcast_id_idx" ON "broadcast_recipients"("broadcast_id");

-- AddForeignKey
ALTER TABLE "broadcast_recipients" ADD CONSTRAINT "broadcast_recipients_broadcast_id_fkey" FOREIGN KEY ("broadcast_id") REFERENCES "broadcasts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
