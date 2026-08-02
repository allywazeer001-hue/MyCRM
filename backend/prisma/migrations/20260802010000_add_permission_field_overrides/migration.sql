-- Field-level permission overrides on top of the existing module-level Permission toggles.
-- TiDB rejects ANY default value on a JSON column (literal or expression) — add it
-- nullable, backfill existing rows, then tighten to NOT NULL. Prisma Client supplies
-- '{}' on every future insert regardless (that's what @default("{}") does at the query
-- layer), so this only matters for rows that already existed before this migration.
ALTER TABLE `permissions` ADD COLUMN `fieldOverrides` JSON NULL;
UPDATE `permissions` SET `fieldOverrides` = JSON_OBJECT() WHERE `fieldOverrides` IS NULL;
ALTER TABLE `permissions` MODIFY COLUMN `fieldOverrides` JSON NOT NULL;
