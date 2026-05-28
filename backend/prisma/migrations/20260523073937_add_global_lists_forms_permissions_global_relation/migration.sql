-- AlterTable
ALTER TABLE `fields` MODIFY `type` ENUM('TEXT', 'TEXTAREA', 'RICH_TEXT', 'NUMBER', 'DECIMAL', 'CURRENCY', 'BOOLEAN', 'CHECKBOX', 'RADIO', 'DROPDOWN', 'MULTI_SELECT', 'DATE', 'DATETIME', 'EMAIL', 'PHONE', 'URL', 'FILE', 'IMAGE', 'SIGNATURE', 'USER_SELECT', 'TAGS', 'FORMULA', 'LOOKUP', 'AUTO_NUMBER', 'STATUS', 'RATING', 'PROGRESS', 'COLOR_PICKER', 'GLOBAL_RELATION') NOT NULL;

-- AlterTable
ALTER TABLE `permissions` ADD COLUMN `canAnalytics` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canDashboard` BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN `canFormBuilder` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `canSettings` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `global_lists` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_lists_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `global_lists_slug_organizationId_key`(`slug`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `global_list_items` (
    `id` VARCHAR(191) NOT NULL,
    `listId` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `label` VARCHAR(191) NOT NULL,
    `value` VARCHAR(191) NOT NULL,
    `level` INTEGER NOT NULL DEFAULT 0,
    `order` INTEGER NOT NULL DEFAULT 0,
    `metadata` JSON NOT NULL,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `global_list_items_listId_idx`(`listId`),
    INDEX `global_list_items_parentId_idx`(`parentId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `forms` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `slug` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `moduleId` VARCHAR(191) NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL DEFAULT 'INTERNAL',
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `settings` JSON NOT NULL,
    `createdById` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `forms_organizationId_idx`(`organizationId`),
    UNIQUE INDEX `forms_slug_organizationId_key`(`slug`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_sections` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `label` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `form_sections_formId_idx`(`formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_fields` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `fieldId` VARCHAR(191) NOT NULL,
    `sectionId` VARCHAR(191) NULL,
    `order` INTEGER NOT NULL DEFAULT 0,
    `isHidden` BOOLEAN NOT NULL DEFAULT false,
    `isReadonly` BOOLEAN NOT NULL DEFAULT false,
    `isRequired` BOOLEAN NULL,
    `conditionalLogic` JSON NULL,
    `customLabel` VARCHAR(191) NULL,
    `customPlaceholder` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `form_fields_formId_idx`(`formId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `form_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `formId` VARCHAR(191) NOT NULL,
    `role` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `canView` BOOLEAN NOT NULL DEFAULT true,
    `canSubmit` BOOLEAN NOT NULL DEFAULT true,
    `canEdit` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `canShare` BOOLEAN NOT NULL DEFAULT false,
    `canManageBuilder` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `form_permissions_formId_idx`(`formId`),
    UNIQUE INDEX `form_permissions_formId_role_organizationId_key`(`formId`, `role`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `global_lists` ADD CONSTRAINT `global_lists_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_list_items` ADD CONSTRAINT `global_list_items_listId_fkey` FOREIGN KEY (`listId`) REFERENCES `global_lists`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `global_list_items` ADD CONSTRAINT `global_list_items_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `global_list_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_moduleId_fkey` FOREIGN KEY (`moduleId`) REFERENCES `dynamic_modules`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `forms` ADD CONSTRAINT `forms_createdById_fkey` FOREIGN KEY (`createdById`) REFERENCES `users`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_sections` ADD CONSTRAINT `form_sections_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_fields` ADD CONSTRAINT `form_fields_sectionId_fkey` FOREIGN KEY (`sectionId`) REFERENCES `form_sections`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `form_permissions` ADD CONSTRAINT `form_permissions_formId_fkey` FOREIGN KEY (`formId`) REFERENCES `forms`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
