/*
  Warnings:

  - You are about to drop the column `org_name` on the `tenants` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `tenants` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "tenants_org_name_key";

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "org_name",
DROP COLUMN "type",
ADD COLUMN     "name" TEXT;
