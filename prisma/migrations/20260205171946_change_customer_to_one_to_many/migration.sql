/*
  Warnings:

  - A unique constraint covering the columns `[user_id,publisher_id]` on the table `customers` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "customers_slug_key";

-- DropIndex
DROP INDEX "customers_user_id_key";

-- CreateIndex
CREATE UNIQUE INDEX "customers_user_id_publisher_id_key" ON "customers"("user_id", "publisher_id");
