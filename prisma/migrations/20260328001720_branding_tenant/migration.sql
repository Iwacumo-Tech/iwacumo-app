-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "font_family" TEXT,
ADD COLUMN     "store_settings" JSONB,
ADD COLUMN     "tagline" TEXT;
