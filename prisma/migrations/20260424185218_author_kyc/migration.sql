-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "invite_email" TEXT,
ADD COLUMN     "invite_sent_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_completed_at" TIMESTAMP(3),
ADD COLUMN     "onboarding_status" TEXT NOT NULL DEFAULT 'active',
ADD COLUMN     "pen_name" TEXT;

-- CreateTable
CREATE TABLE "author_kyc_verifications" (
    "id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
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

    CONSTRAINT "author_kyc_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "author_kyc_verifications_author_id_key" ON "author_kyc_verifications"("author_id");

-- AddForeignKey
ALTER TABLE "author_kyc_verifications" ADD CONSTRAINT "author_kyc_verifications_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "author_kyc_verifications" ADD CONSTRAINT "author_kyc_verifications_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "admin_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
