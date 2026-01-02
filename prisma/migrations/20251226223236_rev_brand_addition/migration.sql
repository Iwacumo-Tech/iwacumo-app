-- AlterTable
ALTER TABLE "order_lineitems" ADD COLUMN     "author_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "platform_fee" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "publisher_earnings" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "brand_color" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "secondary_color" TEXT,
ADD COLUMN     "social_links" JSONB;
