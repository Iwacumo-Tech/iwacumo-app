-- AlterTable
ALTER TABLE "authors" ADD COLUMN     "profile_picture" TEXT,
ADD COLUMN     "social_handles" JSONB;

-- AlterTable
ALTER TABLE "publishers" ADD COLUMN     "bio" TEXT,
ADD COLUMN     "profile_picture" TEXT,
ADD COLUMN     "social_handles" JSONB;
