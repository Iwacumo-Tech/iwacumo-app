/*
  Warnings:

  - You are about to drop the column `org_slug` on the `tenants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "tenants_org_slug_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "org_slug",
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
