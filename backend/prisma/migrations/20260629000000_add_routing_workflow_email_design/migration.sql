-- Add design column to email_templates
ALTER TABLE `email_templates` ADD COLUMN `design` LONGTEXT NULL;

-- Add isRepeatable column to workflows
ALTER TABLE `workflows` ADD COLUMN `isRepeatable` BOOLEAN NOT NULL DEFAULT true;

-- Add recordId column to workflow_executions
ALTER TABLE `workflow_executions` ADD COLUMN `recordId` VARCHAR(191) NULL;
CREATE INDEX `workflow_executions_workflowId_recordId_idx` ON `workflow_executions`(`workflowId`, `recordId`);

-- Create record_routing_configs table
CREATE TABLE `record_routing_configs` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` VARCHAR(191) NULL,
    `moduleId` VARCHAR(191) NOT NULL,
    `organizationId` VARCHAR(191) NOT NULL,
    `isEnabled` BOOLEAN NOT NULL DEFAULT true,
    `priority` INTEGER NOT NULL DEFAULT 0,
    `targetRoles` JSON NOT NULL,
    `filterConditions` JSON NOT NULL,
    `conditionsLogic` VARCHAR(191) NOT NULL DEFAULT 'AND',
    `displayFields` JSON NOT NULL,
    `actions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `record_routing_configs_organizationId_idx`(`organizationId`),
    INDEX `record_routing_configs_moduleId_organizationId_idx`(`moduleId`, `organizationId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `record_routing_configs` ADD CONSTRAINT `record_routing_configs_organizationId_fkey` FOREIGN KEY (`organizationId`) REFERENCES `organizations`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
