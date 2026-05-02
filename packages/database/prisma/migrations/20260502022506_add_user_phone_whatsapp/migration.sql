-- AlterTable
ALTER TABLE "users" ADD COLUMN     "phone" TEXT,
ADD COLUMN     "whatsapp_opt_in" BOOLEAN NOT NULL DEFAULT false;
