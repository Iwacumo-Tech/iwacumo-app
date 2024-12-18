/*
  Warnings:

  - You are about to drop the column `subtitle` on the `book_slide` table. All the data in the column will be lost.
  - Added the required column `Price` to the `book_slide` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "book_slide" DROP COLUMN "subtitle",
ADD COLUMN     "Price" TEXT NOT NULL;
