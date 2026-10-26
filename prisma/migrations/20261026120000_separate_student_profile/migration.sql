-- Keep names nullable to preserve legacy administrator rows whose names are
-- unknown. No names are fabricated or required for authentication.
ALTER TABLE `User`
  MODIFY `name` VARCHAR(150) NULL;

-- The current stored role strings are student/admin/super-admin. These are
-- the database values declared by Role's @map annotations in schema.prisma.
ALTER TABLE `User`
  MODIFY `email` VARCHAR(255) NOT NULL,
  MODIFY `role` ENUM('student', 'admin', 'super-admin') NOT NULL DEFAULT 'student',
  ADD COLUMN `passwordHash` VARCHAR(255) NULL,
  ADD COLUMN `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);

-- Prisma's @updatedAt is client-managed and has no database default in the
-- schema. The temporary default above backfills existing rows; remove it now
-- so the resulting column matches the Prisma datamodel.
ALTER TABLE `User`
  ALTER COLUMN `updatedAt` DROP DEFAULT;

CREATE TABLE `StudentProfile` (
  `id` INTEGER NOT NULL AUTO_INCREMENT,
  `userId` INTEGER NOT NULL,
  `branch` VARCHAR(150) NOT NULL,
  `cgpa` DOUBLE NOT NULL,
  `yearOfStudy` ENUM('FIRST', 'SECOND', 'THIRD', 'FOURTH') NOT NULL,
  `skills` JSON NOT NULL,
  `resumePath` VARCHAR(500) NULL,
  UNIQUE INDEX `StudentProfile_userId_key` (`userId`),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `StudentProfile`
  ADD CONSTRAINT `StudentProfile_userId_fkey`
  FOREIGN KEY (`userId`) REFERENCES `User`(`id`)
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Split each raw skills value on actual LF/CRLF delimiters, then let
-- JSON_QUOTE encode each individual string. This preserves literal
-- backslashes, the two-character sequence \r\n, quotes, and Unicode.
-- Empty input becomes []; a trailing newline is preserved as a final empty
-- string. The position range exceeds the maximum token count of VARCHAR(2048)
-- without relying on recursive CTE depth. GROUP_CONCAT's ORDER BY preserves
-- token order. Its 65535-byte session limit exceeds the 18431-byte worst-case
-- JSON representation of a 2048-character source string.
-- Invalid profile fields become NULL so StudentProfile's NOT NULL constraints
-- stop the migration instead of silently omitting a student. Legacy fields
-- remain available for correction.
SET @separate_student_profile_old_group_concat_max_len := @@SESSION.group_concat_max_len;
SET SESSION group_concat_max_len = 65535;

INSERT INTO `StudentProfile` (`userId`, `branch`, `cgpa`, `yearOfStudy`, `skills`)
WITH
  `digits` (`n`) AS (
    SELECT 0 UNION ALL SELECT 1 UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL
    SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6 UNION ALL SELECT 7 UNION ALL
    SELECT 8 UNION ALL SELECT 9
  ),
  `numbers` (`position`) AS (
    SELECT 1 + ones.`n` + tens.`n` * 10 + hundreds.`n` * 100 + thousands.`n` * 1000
    FROM `digits` AS ones
    CROSS JOIN `digits` AS tens
    CROSS JOIN `digits` AS hundreds
    CROSS JOIN `digits` AS thousands
  ),
  `normalized` AS (
    SELECT
      `id` AS `userId`,
      `branch`,
      `cgpa`,
      `year`,
      REPLACE(`skills`, CONCAT(CHAR(13), CHAR(10)), CHAR(10)) AS `skillsLf`
    FROM `User`
    WHERE `role` = 'student'
  ),
  `items` AS (
    SELECT
      `normalized`.`userId`,
      `numbers`.`position`,
      SUBSTRING_INDEX(
        SUBSTRING_INDEX(`normalized`.`skillsLf`, CHAR(10), `numbers`.`position`),
        CHAR(10),
        -1
      ) AS `skill`
    FROM `normalized`
    JOIN `numbers`
      ON `numbers`.`position` <=
        CHAR_LENGTH(`normalized`.`skillsLf`) -
        CHAR_LENGTH(REPLACE(`normalized`.`skillsLf`, CHAR(10), '')) + 1
    WHERE `normalized`.`skillsLf` <> ''
  ),
  `arrays` AS (
    SELECT
      `userId`,
      GROUP_CONCAT(JSON_QUOTE(`skill`) ORDER BY `position` SEPARATOR ',') AS `skillsJson`
    FROM `items`
    GROUP BY `userId`
  )
SELECT
  `normalized`.`userId`,
  NULLIF(TRIM(`normalized`.`branch`), ''),
  CASE WHEN `normalized`.`cgpa` BETWEEN 0 AND 10 THEN `normalized`.`cgpa` ELSE NULL END,
  CASE `normalized`.`year`
    WHEN 1 THEN 'FIRST'
    WHEN 2 THEN 'SECOND'
    WHEN 3 THEN 'THIRD'
    WHEN 4 THEN 'FOURTH'
    ELSE NULL
  END,
  CAST(CONCAT('[', COALESCE(`arrays`.`skillsJson`, ''), ']') AS JSON)
FROM `normalized`
LEFT JOIN `arrays`
  ON `arrays`.`userId` = `normalized`.`userId`;

SET SESSION group_concat_max_len = @separate_student_profile_old_group_concat_max_len;
SET @separate_student_profile_old_group_concat_max_len = NULL;

-- Keep legacy User.branch/cgpa/skills/year columns in place. Remove them only
-- in a later reviewed migration after comparing all copied StudentProfile data.
