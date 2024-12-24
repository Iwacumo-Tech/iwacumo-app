/*
  Warnings:

  - You are about to drop the column `description` on the `books` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "books" DROP COLUMN "description",
ADD COLUMN     "book_cover2" TEXT,
ADD COLUMN     "book_cover3" TEXT,
ADD COLUMN     "book_cover4" TEXT,
ADD COLUMN     "e_copy" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "hard_cover" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "long_description" TEXT,
ADD COLUMN     "paper_back" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "short_description" TEXT,
ADD COLUMN     "tags" TEXT[];
