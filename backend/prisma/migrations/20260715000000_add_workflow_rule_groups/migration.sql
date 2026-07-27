-- CreateTable
CREATE TABLE `workflow_rule_groups` (
    `id` VARCHAR(191) NOT NULL,
    `workflowId` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL DEFAULT 'Rule 1',
    `order` INTEGER NOT NULL DEFAULT 0,
    `isActive` BOOLEAN NOT NULL DEFAULT true,
    `conditions` JSON NOT NULL,
    `actions` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `workflow_rule_groups_workflowId_idx`(`workflowId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `workflow_rule_groups` ADD CONSTRAINT `workflow_rule_groups_workflowId_fkey` FOREIGN KEY (`workflowId`) REFERENCES `workflows`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
