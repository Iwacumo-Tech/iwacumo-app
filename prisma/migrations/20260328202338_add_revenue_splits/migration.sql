-- CreateTable
CREATE TABLE "publisher_author_splits" (
    "id" TEXT NOT NULL,
    "publisher_id" TEXT NOT NULL,
    "author_id" TEXT NOT NULL,
    "publisher_split_percent" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "publisher_author_splits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "book_split_overrides" (
    "id" TEXT NOT NULL,
    "book_id" TEXT NOT NULL,
    "publisher_split_percent" DOUBLE PRECISION NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "book_split_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "publisher_author_splits_publisher_id_author_id_key" ON "publisher_author_splits"("publisher_id", "author_id");

-- CreateIndex
CREATE UNIQUE INDEX "book_split_overrides_book_id_key" ON "book_split_overrides"("book_id");

-- AddForeignKey
ALTER TABLE "publisher_author_splits" ADD CONSTRAINT "publisher_author_splits_publisher_id_fkey" FOREIGN KEY ("publisher_id") REFERENCES "publishers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "publisher_author_splits" ADD CONSTRAINT "publisher_author_splits_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "authors"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "book_split_overrides" ADD CONSTRAINT "book_split_overrides_book_id_fkey" FOREIGN KEY ("book_id") REFERENCES "books"("id") ON DELETE CASCADE ON UPDATE CASCADE;
