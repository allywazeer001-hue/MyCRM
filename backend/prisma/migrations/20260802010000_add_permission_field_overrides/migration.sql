-- Field-level permission overrides on top of the existing module-level Permission toggles.
ALTER TABLE `permissions` ADD COLUMN `fieldOverrides` JSON NOT NULL DEFAULT ('{}');
