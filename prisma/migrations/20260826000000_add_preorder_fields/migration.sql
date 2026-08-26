-- AlterTable
ALTER TABLE "books" ADD COLUMN "preorder_enabled" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Cart" ADD COLUMN "is_preorder" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "order_lineitems" ADD COLUMN "is_preorder" BOOLEAN NOT NULL DEFAULT false;
