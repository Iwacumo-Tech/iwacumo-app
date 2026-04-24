-- AlterTable
ALTER TABLE "book_variants" ADD COLUMN     "custom_height_in" DOUBLE PRECISION,
ADD COLUMN     "custom_width_in" DOUBLE PRECISION,
ADD COLUMN     "display_height_in" DOUBLE PRECISION,
ADD COLUMN     "display_width_in" DOUBLE PRECISION,
ADD COLUMN     "flap_type" TEXT DEFAULT 'none',
ADD COLUMN     "lamination_type" TEXT,
ADD COLUMN     "paper_type" TEXT,
ADD COLUMN     "size_bucket" TEXT,
ADD COLUMN     "trim_size_mode" TEXT DEFAULT 'standard';

-- AlterTable
ALTER TABLE "books" ADD COLUMN     "author_markup_type" TEXT NOT NULL DEFAULT 'percentage',
ADD COLUMN     "author_markup_value" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "isbn" TEXT,
ADD COLUMN     "special_addon_description" TEXT,
ADD COLUMN     "special_addon_fee" DOUBLE PRECISION NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "book_issue_reports" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "reporter_user_id" TEXT,
    "reporter_name" TEXT,
    "reporter_email" TEXT,
    "issue_type" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'open',
    "reviewer_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_issue_reports_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "book_issue_reports" ADD CONSTRAINT "book_issue_reports_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
