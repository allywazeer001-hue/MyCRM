-- AlterTable
ALTER TABLE `connected_app_auth_codes` ADD COLUMN `clientSecretEnc` TEXT NULL,
    ADD COLUMN `failedAttempts` INTEGER NOT NULL DEFAULT 0;
