/*
  Warnings:

  - Made the column `buttonRoute` on table `hero_slide` required. This step will fail if there are existing NULL values in that column.
  - Made the column `buttonText` on table `hero_slide` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "hero_slide" ALTER COLUMN "buttonRoute" SET NOT NULL,
ALTER COLUMN "buttonText" SET NOT NULL;
