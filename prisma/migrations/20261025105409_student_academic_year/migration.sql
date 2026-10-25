ALTER TABLE `User`
  ADD COLUMN `year` INTEGER NULL;

UPDATE `User`
SET `year` = 3
WHERE `role` = 'student' AND `year` IS NULL;
