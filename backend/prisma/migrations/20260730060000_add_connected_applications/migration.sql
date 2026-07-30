-- CreateTable
CREATE TABLE `connection_requests` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `appName` VARCHAR(191) NOT NULL,
    `appUrl` VARCHAR(191) NOT NULL,
    `appLogoUrl` VARCHAR(191) NULL,
    `developerName` VARCHAR(191) NOT NULL,
    `developerEmail` VARCHAR(191) NULL,
    `requestedScopes` JSON NOT NULL,
    `redirectUrl` VARCHAR(191) NOT NULL,
    `publicKey` TEXT NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedByUserId` VARCHAR(191) NULL,
    `reviewedAt` DATETIME(3) NULL,
    `rejectionReason` VARCHAR(191) NULL,
    `connectedAppId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `connection_requests_connectedAppId_key`(`connectedAppId`),
    INDEX `connection_requests_organizationId_status_idx`(`organizationId`, `status`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connected_apps` (
    `id` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `logoUrl` VARCHAR(191) NULL,
    `developerName` VARCHAR(191) NOT NULL,
    `redirectUrl` VARCHAR(191) NOT NULL,
    `publicKey` TEXT NULL,
    `clientId` VARCHAR(191) NOT NULL,
    `clientSecretHash` VARCHAR(191) NOT NULL,
    `webhookSecretEnc` VARCHAR(191) NULL,
    `status` ENUM('ACTIVE', 'SUSPENDED', 'REVOKED') NOT NULL DEFAULT 'ACTIVE',
    `connectedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `lastSyncAt` DATETIME(3) NULL,
    `lastApiCallAt` DATETIME(3) NULL,
    `lastTokenRefreshAt` DATETIME(3) NULL,
    `createdByUserId` VARCHAR(191) NOT NULL,
    `ipAllowlist` JSON NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `connected_apps_clientId_key`(`clientId`),
    INDEX `connected_apps_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connected_app_scopes` (
    `id` VARCHAR(191) NOT NULL,
    `connectedAppId` VARCHAR(191) NOT NULL,
    `scopeKey` VARCHAR(191) NOT NULL,
    `access` ENUM('DENY', 'READ_ONLY', 'READ_WRITE') NOT NULL DEFAULT 'DENY',

    UNIQUE INDEX `connected_app_scopes_connectedAppId_scopeKey_key`(`connectedAppId`, `scopeKey`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connected_app_auth_codes` (
    `id` VARCHAR(191) NOT NULL,
    `connectedAppId` VARCHAR(191) NOT NULL,
    `codeHash` VARCHAR(191) NOT NULL,
    `codePrefix` VARCHAR(191) NOT NULL,
    `expiresAt` DATETIME(3) NOT NULL,
    `usedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `connected_app_auth_codes_codePrefix_idx`(`codePrefix`),
    INDEX `connected_app_auth_codes_connectedAppId_idx`(`connectedAppId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `connected_app_tokens` (
    `id` VARCHAR(191) NOT NULL,
    `connectedAppId` VARCHAR(191) NOT NULL,
    `accessTokenJti` VARCHAR(191) NOT NULL,
    `refreshTokenHash` VARCHAR(191) NOT NULL,
    `refreshTokenPrefix` VARCHAR(191) NOT NULL,
    `accessExpiresAt` DATETIME(3) NOT NULL,
    `refreshExpiresAt` DATETIME(3) NOT NULL,
    `revokedAt` DATETIME(3) NULL,
    `rotatedFromId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `connected_app_tokens_accessTokenJti_key`(`accessTokenJti`),
    UNIQUE INDEX `connected_app_tokens_rotatedFromId_key`(`rotatedFromId`),
    INDEX `connected_app_tokens_connectedAppId_idx`(`connectedAppId`),
    INDEX `connected_app_tokens_refreshTokenPrefix_idx`(`refreshTokenPrefix`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `connection_requests` ADD CONSTRAINT `connection_requests_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connection_requests` ADD CONSTRAINT `connection_requests_connectedAppId_fkey` FOREIGN KEY (`connectedAppId`) REFERENCES `connected_apps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connected_apps` ADD CONSTRAINT `connected_apps_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connected_app_scopes` ADD CONSTRAINT `connected_app_scopes_connectedAppId_fkey` FOREIGN KEY (`connectedAppId`) REFERENCES `connected_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connected_app_auth_codes` ADD CONSTRAINT `connected_app_auth_codes_connectedAppId_fkey` FOREIGN KEY (`connectedAppId`) REFERENCES `connected_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connected_app_tokens` ADD CONSTRAINT `connected_app_tokens_connectedAppId_fkey` FOREIGN KEY (`connectedAppId`) REFERENCES `connected_apps`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `connected_app_tokens` ADD CONSTRAINT `connected_app_tokens_rotatedFromId_fkey` FOREIGN KEY (`rotatedFromId`) REFERENCES `connected_app_tokens`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

