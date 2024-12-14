/*
  Warnings:

  - You are about to drop the column `bio` on the `authors` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "authors" DROP COLUMN "bio",
ADD COLUMN     "name" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "name" TEXT;
