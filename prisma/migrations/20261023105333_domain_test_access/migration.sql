-- AlterTable: add isDefault and isPublished flags to PlacementTest
-- isDefault marks pre-seeded tests that are always visible to students.
-- isPublished controls visibility of admin-created (custom) tests.
ALTER TABLE `PlacementTest`
  ADD COLUMN `isDefault` BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN `isPublished` BOOLEAN NOT NULL DEFAULT false;
