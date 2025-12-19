/*
  Warnings:

  - You are about to drop the column `publisher_id` on the `admin_users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[admin_user_id,role_name,publisher_id,tenant_id]` on the table `admin_user_roles` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `tenant_id` to the `admin_user_roles` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenant_id` to the `admin_users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "admin_users" DROP CONSTRAINT "admin_users_publisher_id_fkey";

-- DropIndex
DROP INDEX "admin_user_roles_admin_user_id_role_name_publisher_id_key";

-- AlterTable
ALTER TABLE "admin_user_roles" ADD COLUMN     "tenant_id" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "admin_users" DROP COLUMN "publisher_id",
ADD COLUMN     "tenant_id" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "admin_user_roles_admin_user_id_role_name_publisher_id_tenan_key" ON "admin_user_roles"("admin_user_id", "role_name", "publisher_id", "tenant_id");

-- AddForeignKey
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "admin_user_roles" ADD CONSTRAINT "admin_user_roles_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
