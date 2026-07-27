-- AlterTable
ALTER TABLE `email_logs`
    ADD COLUMN `batchId` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `email_logs_batchId_idx` ON `email_logs`(`batchId`);

-- CreateTable
CREATE TABLE `scheduled_emails` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `sentById` VARCHAR(191) NOT NULL,
    `recipients` JSON NOT NULL,
    `subject` VARCHAR(191) NOT NULL,
    `body` LONGTEXT NOT NULL,
    `templateId` VARCHAR(191) NULL,
    `replyTo` VARCHAR(191) NULL,
    `sendAt` DATETIME(3) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `errorMsg` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `sentAt` DATETIME(3) NULL,

    INDEX `scheduled_emails_organizationId_idx`(`organizationId`),
    INDEX `scheduled_emails_status_sendAt_idx`(`status`, `sendAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `scheduled_emails` ADD CONSTRAINT `scheduled_emails_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scheduled_emails` ADD CONSTRAINT `scheduled_emails_sentById_fkey` FOREIGN KEY (`sentById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
