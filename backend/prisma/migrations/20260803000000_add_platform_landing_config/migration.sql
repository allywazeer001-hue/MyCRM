-- CreateTable
-- No DEFAULT on `config` — TiDB rejects any default value on a JSON column
-- (literal or expression). Prisma Client supplies '{}' on every insert
-- regardless (that's what @default("{}") does at the query layer), and this
-- is a brand-new table with no existing rows to backfill.
CREATE TABLE `platform_landing_configs` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `config` JSON NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
