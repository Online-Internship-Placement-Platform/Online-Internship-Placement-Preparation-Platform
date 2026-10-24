-- AlterTable
ALTER TABLE `Internship` ADD COLUMN `requiredSkills` VARCHAR(2048) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `User` ADD COLUMN `skills` VARCHAR(2048) NOT NULL DEFAULT '';
