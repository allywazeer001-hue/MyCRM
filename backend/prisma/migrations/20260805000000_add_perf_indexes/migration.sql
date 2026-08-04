-- Composite indexes matching the actual WHERE-clause shapes used by the
-- hottest queries in the app (RecordsService.findAll/findOne, and every
-- Field lookup) instead of relying on separate single-column indexes.
CREATE INDEX `records_moduleId_organizationId_isDeleted_idx` ON `records`(`moduleId`, `organizationId`, `isDeleted`);
CREATE INDEX `fields_moduleId_isActive_idx` ON `fields`(`moduleId`, `isActive`);
