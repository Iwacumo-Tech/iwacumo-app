-- AlterTable
ALTER TABLE "banner" ADD COLUMN     "tenant_id" TEXT;

-- AlterTable
ALTER TABLE "hero_slide" ADD COLUMN     "tenant_id" TEXT;

-- AddForeignKey
ALTER TABLE "hero_slide" ADD CONSTRAINT "hero_slide_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "banner" ADD CONSTRAINT "banner_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE SET NULL ON UPDATE CASCADE;
