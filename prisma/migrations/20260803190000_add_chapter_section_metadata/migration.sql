ALTER TABLE "chapters"
ADD COLUMN "section_type" TEXT NOT NULL DEFAULT 'chapter',
ADD COLUMN "sort_order" INTEGER NOT NULL DEFAULT 0;

UPDATE "chapters"
SET "sort_order" = "chapter_number";
