-- Add request tracking fields to blueprint_tasks
ALTER TABLE `blueprint_tasks`
  ADD COLUMN `seenAt` DATETIME(3) NULL,
  ADD COLUMN `processedAt` DATETIME(3) NULL,
  ADD COLUMN `sentNote` TEXT NULL,
  ADD COLUMN `requestType` VARCHAR(50) NOT NULL DEFAULT 'approval';

-- Index for faster lookup by assignedToId + status
ALTER TABLE `blueprint_tasks` ADD INDEX `blueprint_tasks_requestType_idx` (`requestType`);
