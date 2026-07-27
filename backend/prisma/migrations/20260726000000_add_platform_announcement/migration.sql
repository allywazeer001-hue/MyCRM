-- CreateTable
CREATE TABLE `platform_announcements` (
    `id` VARCHAR(191) NOT NULL DEFAULT 'global',
    `message` TEXT NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT false,
    `startDate` DATETIME(3) NULL,
    `endDate` DATETIME(3) NULL,
    `dailyStartTime` VARCHAR(191) NULL,
    `dailyEndTime` VARCHAR(191) NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
