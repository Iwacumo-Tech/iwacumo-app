-- AlterTable
ALTER TABLE "books" ADD COLUMN "preorder_reminder_sent" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "books" ADD COLUMN "preorder_available_sent" BOOLEAN NOT NULL DEFAULT false;
