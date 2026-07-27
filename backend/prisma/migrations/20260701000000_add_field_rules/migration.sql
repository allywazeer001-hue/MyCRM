-- CreateTable
CREATE TABLE `field_rules` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `logic` VARCHAR(191) NOT NULL DEFAULT 'AND',
    `conditions` JSON NOT NULL,
    `actions` JSON NOT NULL,
    `stopOnMatch` BOOLEAN NOT NULL DEFAULT false,
    `runOnLoad` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `field_rules_moduleId_organizationId_idx`(`moduleId`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
