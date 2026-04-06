-- CreateTable
CREATE TABLE "kyc_verifications" (
    "id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "id_document_url" TEXT,
    "id_document_type" TEXT,
    "legal_name" TEXT,
    "phone_number" TEXT,
    "business_reg_url" TEXT,
    "business_name" TEXT,
    "business_address" TEXT,
    "proof_of_address_url" TEXT,
    "submitted_at" TIMESTAMP(3),
    "reviewed_at" TIMESTAMP(3),
    "reviewer_id" TEXT,
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "kyc_verifications_publisher_id_key" ON "kyc_verifications"("publisher_id");

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kyc_verifications" ADD CONSTRAINT "kyc_verifications_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
