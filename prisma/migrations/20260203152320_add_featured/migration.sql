/*
  Warnings:

  - You are about to drop the column `featured` on the `books` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "books" DROP COLUMN "featured",
ADD COLUMN     "featured_global" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "featured_shop" BOOLEAN NOT NULL DEFAULT false;
