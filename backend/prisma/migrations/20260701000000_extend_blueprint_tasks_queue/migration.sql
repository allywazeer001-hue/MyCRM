-- Extend blueprint_tasks for Request Queue feature
ALTER TABLE `blueprint_tasks`
  ADD COLUMN `title`       VARCHAR(255) NULL,
  ADD COLUMN `priority`    VARCHAR(20)  NULL DEFAULT 'medium',
  ADD COLUMN `dueDate`     DATETIME(3)  NULL,
  ADD COLUMN `assignedDept` VARCHAR(100) NULL;
