/*
  Warnings:

  - Changed the type of `Price` on the `book_slide` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- AlterTable
ALTER TABLE "book_slide" DROP COLUMN "Price",
ADD COLUMN     "Price" DOUBLE PRECISION NOT NULL;
