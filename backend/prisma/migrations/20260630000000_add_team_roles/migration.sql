-- Create team_roles table
CREATE TABLE `team_roles` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `color` VARCHAR(191) NOT NULL DEFAULT '#6366f1',
    `organizationId` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `team_roles_organizationId_idx`(`organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Add teamRoleId to users
ALTER TABLE `users` ADD COLUMN `teamRoleId` VARCHAR(191) NULL;

-- Add foreign key constraints
ALTER TABLE `team_roles` ADD CONSTRAINT `team_roles_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `users` ADD CONSTRAINT `users_teamRoleId_fkey` FOREIGN KEY (`teamRoleId`) REFERENCES `team_roles`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
