/*
  Warnings:

  - You are about to drop the column `name` on the `publishers` table. All the data in the column will be lost.
  - You are about to drop the column `website` on the `publishers` table. All the data in the column will be lost.
  - You are about to drop the column `name` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `slug` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `tenants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[org_name]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[org_slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `org_name` to the `tenants` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "tenants_name_key";

-- DropIndex
DROP INDEX "tenants_slug_key";

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "book_cover" TEXT;

-- AlterTable
ALTER TABLE "publishers" DROP COLUMN "name",
DROP COLUMN "website";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "name",
DROP COLUMN "slug",
DROP COLUMN "type",
ADD COLUMN     "org_name" TEXT NOT NULL,
ADD COLUMN     "org_slug" TEXT;

-- CreateTable
CREATE TABLE "chapters" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "sub_title" TEXT,
    "content" TEXT NOT NULL,
    "summary" TEXT,
    "chapter_number" INTEGER NOT NULL,
    "word_count" INTEGER NOT NULL DEFAULT 0,
    "book_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chapters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chapter_images" (
    "id" TEXT NOT NULL,
    "image_url" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "caption" TEXT,
    "chapter_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "chapter_images_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_org_name_key" ON "tenants"("org_name");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_org_slug_key" ON "tenants"("org_slug");

-- AddForeignKey
ALTER TABLE "chapters" ADD CONSTRAINT "chapters_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chapter_images" ADD CONSTRAINT "chapter_images_chapter_id_fkey" FOREIGN KEY ("chapter_id") REFERENCES "chapters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
