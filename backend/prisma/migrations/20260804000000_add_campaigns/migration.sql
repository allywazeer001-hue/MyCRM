-- CreateTable
CREATE TABLE `campaigns` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `type` ENUM('GENERAL_ANNOUNCEMENT', 'EVENT', 'REMINDER', 'SCHOLARSHIP', 'HEALTH_CAMP', 'REGISTRATION', 'MARKETING', 'NOTIFICATION', 'CUSTOM') NOT NULL DEFAULT 'GENERAL_ANNOUNCEMENT',
    `status` ENUM('DRAFT', 'SCHEDULED', 'QUEUED', 'RUNNING', 'PAUSED', 'COMPLETED', 'PARTIALLY_FAILED', 'FAILED', 'CANCELLED') NOT NULL DEFAULT 'DRAFT',
    `tags` JSON NOT NULL,
    `audienceConfig` JSON NOT NULL,
    `scheduledAt` DATETIME(3) NULL,
    `timezone` VARCHAR(191) NULL,
    `startedAt` DATETIME(3) NULL,
    `completedAt` DATETIME(3) NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `campaigns_organizationId_idx`(`organizationId`),
    INDEX `campaigns_organizationId_status_idx`(`organizationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_channels` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `channel` ENUM('SMS', 'WHATSAPP', 'EMAIL') NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `content` JSON NOT NULL,
    `sentCount` INTEGER NOT NULL DEFAULT 0,
    `deliveredCount` INTEGER NOT NULL DEFAULT 0,
    `failedCount` INTEGER NOT NULL DEFAULT 0,
    `openedCount` INTEGER NOT NULL DEFAULT 0,
    `clickedCount` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `campaign_channels_campaignId_idx`(`campaignId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `campaign_recipients` (
    `id` VARCHAR(191) NOT NULL,
    `campaignId` VARCHAR(191) NOT NULL,
    `campaignChannelId` VARCHAR(191) NOT NULL,
    `moduleId` VARCHAR(191) NULL,
    `recordId` VARCHAR(191) NULL,
    `channel` ENUM('SMS', 'WHATSAPP', 'EMAIL') NOT NULL,
    `providerId` VARCHAR(191) NULL,
    `providerMessageId` VARCHAR(191) NULL,
    `destination` VARCHAR(191) NOT NULL,
    `personalizedMessage` TEXT NULL,
    `status` ENUM('PENDING', 'QUEUED', 'SENDING', 'SENT', 'DELIVERED', 'FAILED', 'BOUNCED', 'OPENED', 'CLICKED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `failureReason` TEXT NULL,
    `retryCount` INTEGER NOT NULL DEFAULT 0,
    `cost` DECIMAL(10, 4) NULL,
    `currency` VARCHAR(191) NULL,
    `queuedAt` DATETIME(3) NULL,
    `sentAt` DATETIME(3) NULL,
    `deliveredAt` DATETIME(3) NULL,
    `failedAt` DATETIME(3) NULL,
    `openedAt` DATETIME(3) NULL,
    `clickedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `campaign_recipients_campaignId_idx`(`campaignId`),
    INDEX `campaign_recipients_campaignId_status_idx`(`campaignId`, `status`),
    INDEX `campaign_recipients_providerMessageId_idx`(`providerMessageId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_providers` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `channel` ENUM('SMS', 'WHATSAPP', 'EMAIL') NOT NULL,
    `provider` ENUM('BEEM', 'AFRICAS_TALKING', 'TWILIO', 'META_WHATSAPP', 'RESEND', 'SMTP') NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `config` JSON NOT NULL,
    `secretEnc` TEXT NULL,
    `isDefault` BOOLEAN NOT NULL DEFAULT false,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `lastTestedAt` DATETIME(3) NULL,
    `lastTestStatus` VARCHAR(191) NULL,
    `lastTestError` TEXT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `communication_providers_organizationId_idx`(`organizationId`),
    INDEX `communication_providers_organizationId_channel_idx`(`organizationId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `message_templates` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `channel` ENUM('SMS', 'WHATSAPP', 'EMAIL') NOT NULL,
    `category` VARCHAR(191) NULL,
    `subject` VARCHAR(191) NULL,
    `body` TEXT NULL,
    `whatsappTemplateName` VARCHAR(191) NULL,
    `whatsappTemplateLanguage` VARCHAR(191) NULL,
    `variables` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'ACTIVE',
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `message_templates_organizationId_idx`(`organizationId`),
    INDEX `message_templates_organizationId_channel_idx`(`organizationId`, `channel`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `communication_opt_outs` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `channel` ENUM('SMS', 'WHATSAPP', 'EMAIL') NOT NULL,
    `destination` VARCHAR(191) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `communication_opt_outs_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `communication_opt_outs_organizationId_channel_destination_key`(`organizationId`, `channel`, `destination`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaigns` ADD CONSTRAINT `campaigns_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_channels` ADD CONSTRAINT `campaign_channels_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaign_channels` ADD CONSTRAINT `campaign_channels_providerId_fkey` FOREIGN KEY (`providerId`) REFERENCES `communication_providers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_campaignId_fkey` FOREIGN KEY (`campaignId`) REFERENCES `campaigns`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `campaign_recipients` ADD CONSTRAINT `campaign_recipients_campaignChannelId_fkey` FOREIGN KEY (`campaignChannelId`) REFERENCES `campaign_channels`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_providers` ADD CONSTRAINT `communication_providers_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `message_templates` ADD CONSTRAINT `message_templates_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `communication_opt_outs` ADD CONSTRAINT `communication_opt_outs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
