/*
  Warnings:

  - You are about to drop the column `code` on the `permissions` table. All the data in the column will be lost.
  - You are about to drop the column `owner_id` on the `tenants` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[id,role_name]` on the table `permission_role` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[resource_id,action,module]` on the table `permissions` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[slug]` on the table `tenants` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "tenants" DROP CONSTRAINT "tenants_owner_id_fkey";

-- DropIndex
DROP INDEX "permission_role_permission_id_role_name_key";

-- DropIndex
DROP INDEX "permissions_code_key";

-- DropIndex
DROP INDEX "tenants_owner_id_key";

-- AlterTable
ALTER TABLE "claims" ADD COLUMN     "tenant_slug" TEXT;

-- AlterTable
ALTER TABLE "permissions" DROP COLUMN "code",
ALTER COLUMN "active" SET DEFAULT true;

-- AlterTable
ALTER TABLE "roles" ADD COLUMN     "deleted_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "tenants" DROP COLUMN "owner_id",
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "slug" TEXT,
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'school';

-- CreateIndex
CREATE UNIQUE INDEX "permission_role_id_role_name_key" ON "permission_role"("id", "role_name");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_resource_id_action_module_key" ON "permissions"("resource_id", "action", "module");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");
