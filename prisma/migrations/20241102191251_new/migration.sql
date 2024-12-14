/*
  Warnings:

  - A unique constraint covering the columns `[slug]` on the table `authors` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `books` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `customers` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `publishers` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "slug" TEXT;

-- AlterTable
ALTER TABLE "publishers" ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "authors_slug_key" ON "authors"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "books_slug_key" ON "books"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "customers_slug_key" ON "customers"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "publishers_slug_key" ON "publishers"("slug");
