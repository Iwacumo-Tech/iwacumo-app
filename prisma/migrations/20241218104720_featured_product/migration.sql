-- CreateTable
CREATE TABLE "featured_products" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "Price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),

    CONSTRAINT "featured_products_pkey" PRIMARY KEY ("id")
);
