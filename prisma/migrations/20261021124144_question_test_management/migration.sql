-- CreateTable
CREATE TABLE `Question` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `prompt` TEXT NOT NULL,
    `optionA` TEXT NOT NULL,
    `optionB` TEXT NOT NULL,
    `optionC` TEXT NOT NULL,
    `optionD` TEXT NOT NULL,
    `correctOption` ENUM('A', 'B', 'C', 'D') NOT NULL,
    `domain` ENUM('WEB_DEVELOPMENT', 'AI_ML', 'CORE_CS', 'NETWORKS', 'DATABASES') NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PlacementTest` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `title` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `domain` ENUM('WEB_DEVELOPMENT', 'AI_ML', 'CORE_CS', 'NETWORKS', 'DATABASES') NOT NULL,
    `difficulty` ENUM('EASY', 'MEDIUM', 'HARD') NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TestQuestion` (
    `testId` INTEGER NOT NULL,
    `questionId` INTEGER NOT NULL,
    `order` INTEGER NOT NULL,

    INDEX `TestQuestion_questionId_idx`(`questionId`),
    UNIQUE INDEX `TestQuestion_testId_order_key`(`testId`, `order`),
    PRIMARY KEY (`testId`, `questionId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TestQuestion` ADD CONSTRAINT `TestQuestion_testId_fkey` FOREIGN KEY (`testId`) REFERENCES `PlacementTest`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `TestQuestion` ADD CONSTRAINT `TestQuestion_questionId_fkey` FOREIGN KEY (`questionId`) REFERENCES `Question`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
