-- AlterTable
ALTER TABLE `internship` ADD COLUMN `requiredSkills` VARCHAR(2048) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `user` ADD COLUMN `skills` VARCHAR(2048) NOT NULL DEFAULT '';
