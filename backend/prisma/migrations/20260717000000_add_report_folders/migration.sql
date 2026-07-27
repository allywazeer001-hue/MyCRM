-- CreateTable
CREATE TABLE `report_folders` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `isPublic` BOOLEAN NOT NULL DEFAULT false,
    `sharedRoles` JSON NOT NULL,
    `sharedDepartments` JSON NOT NULL,
    `sharedUsers` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `report_folders_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable
ALTER TABLE `saved_reports` ADD COLUMN `folderId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `saved_reports_folderId_idx` ON `saved_reports`(`folderId`);

-- AddForeignKey
ALTER TABLE `report_folders` ADD CONSTRAINT `report_folders_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `report_folders` ADD CONSTRAINT `report_folders_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `saved_reports` ADD CONSTRAINT `saved_reports_folderId_fkey` FOREIGN KEY (`folderId`) REFERENCES `report_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
