-- Drop FK constraint from users.teamRoleId
ALTER TABLE `users` DROP FOREIGN KEY `users_teamRoleId_fkey`;

-- Rename column: teamRoleId -> teamRole (plain string, no FK, stores role label)
ALTER TABLE `users` CHANGE `teamRoleId` `teamRole` VARCHAR(191) NULL;

-- Drop the team_roles table (roles now managed via Global Lists)
DROP TABLE IF EXISTS `team_roles`;
