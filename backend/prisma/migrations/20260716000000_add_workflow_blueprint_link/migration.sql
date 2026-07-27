-- AlterTable
ALTER TABLE `workflows`
  ADD COLUMN `linkedBlueprintId` VARCHAR(191) NULL,
  ADD COLUMN `linkedTransitionId` VARCHAR(191) NULL;
