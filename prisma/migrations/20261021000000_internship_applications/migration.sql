-- Extend the existing prototype user record for server-side student identity.
ALTER TABLE `User`
  ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'student',
  ADD COLUMN `branch` VARCHAR(191) NULL,
  ADD COLUMN `cgpa` DOUBLE NULL;

CREATE TABLE `Internship` (
  `id` VARCHAR(191) NOT NULL,
  `company` VARCHAR(191) NOT NULL,
  `role` VARCHAR(191) NOT NULL,
  `applicationDeadline` DATE NOT NULL,
  `published` BOOLEAN NOT NULL DEFAULT false,
  `acceptingApplications` BOOLEAN NOT NULL DEFAULT false,
  `minCgpa` DOUBLE NOT NULL DEFAULT 0,
  `eligibleBranches` TEXT NOT NULL,
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

CREATE TABLE `Application` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `studentId` INTEGER NOT NULL,
  `internshipId` VARCHAR(191) NOT NULL,
  `status` VARCHAR(191) NOT NULL DEFAULT 'Pending',
  `appliedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  UNIQUE INDEX `Application_studentId_internshipId_key` (`studentId`, `internshipId`),
  INDEX `Application_internshipId_idx` (`internshipId`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `Application`
  ADD CONSTRAINT `Application_studentId_fkey` FOREIGN KEY (`studentId`) REFERENCES `User`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT `Application_internshipId_fkey` FOREIGN KEY (`internshipId`) REFERENCES `Internship`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
