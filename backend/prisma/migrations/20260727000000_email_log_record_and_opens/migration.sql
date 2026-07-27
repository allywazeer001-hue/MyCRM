-- AlterTable
ALTER TABLE `email_logs`
    ADD COLUMN `recordId` VARCHAR(191) NULL,
    ADD COLUMN `openedAt` DATETIME(3) NULL;

-- CreateIndex
CREATE INDEX `email_logs_recordId_idx` ON `email_logs`(`recordId`);
