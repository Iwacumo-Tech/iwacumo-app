-- Backfill: assign all existing authors without a publisher to the iwacumo platform publisher
UPDATE "authors"
SET "publisher_id" = (SELECT id FROM "publishers" WHERE slug = 'iwacumo' LIMIT 1)
WHERE "publisher_id" IS NULL;
