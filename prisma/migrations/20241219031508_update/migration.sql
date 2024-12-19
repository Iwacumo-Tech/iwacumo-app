/*
  Warnings:

  - You are about to drop the `book_slide` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `featured_products` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterTable
ALTER TABLE "hero_slide" ADD COLUMN     "buttonRoute" TEXT,
ADD COLUMN     "buttonText" TEXT;

-- DropTable
DROP TABLE "book_slide";

-- DropTable
DROP TABLE "featured_products";
