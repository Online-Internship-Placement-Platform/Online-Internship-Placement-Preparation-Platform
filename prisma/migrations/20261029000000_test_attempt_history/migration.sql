-- CreateTable: TestAttempt — stores each student's placement test submission separately.
-- A new row is inserted for every submission; previous rows are never overwritten.
-- studentId stores the authenticated account email from the server-side session.
-- answers stores JSON: Array of {questionId, studentAnswer, correctAnswer, isCorrect}.
CREATE TABLE `TestAttempt` (
    `id`             INTEGER     NOT NULL AUTO_INCREMENT,
    `studentId`      VARCHAR(191) NOT NULL,
    `testId`         INTEGER     NOT NULL,
    `correctCount`   INTEGER     NOT NULL,
    `totalQuestions` INTEGER     NOT NULL,
    `percentage`     DOUBLE      NOT NULL,
    `answers`        JSON        NOT NULL,
    `completedAt`    DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `TestAttempt_studentId_testId_idx`(`studentId`, `testId`),
    INDEX `TestAttempt_studentId_completedAt_idx`(`studentId`, `completedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TestAttempt` ADD CONSTRAINT `TestAttempt_testId_fkey`
    FOREIGN KEY (`testId`) REFERENCES `PlacementTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
