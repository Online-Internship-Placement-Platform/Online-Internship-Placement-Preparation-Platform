CREATE TABLE `RecommendedVideo` (
  `id` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `youtubeId` VARCHAR(11) NOT NULL,
  `channelName` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `category` ENUM('SOFTWARE_DEVELOPMENT', 'DATA_ANALYTICS', 'DESIGN_UI_UX', 'APTITUDE_LOGICAL_REASONING') NOT NULL,
  `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `updatedAt` DATETIME(3) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE INDEX `RecommendedVideo_youtubeId_key` (`youtubeId`),
  INDEX `RecommendedVideo_category_idx` (`category`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `RecommendedVideo` (`id`, `title`, `youtubeId`, `channelName`, `description`, `category`, `createdAt`, `updatedAt`) VALUES
  ('software-development-BgLTDT03QtU', 'Big-O Notation - For Coding Interviews', 'BgLTDT03QtU', 'NeetCode', 'Review common time and space complexities with a focus on coding interviews.', 'SOFTWARE_DEVELOPMENT', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('software-development-KLlXCFG5TnA', 'Two Sum - Leetcode 1 - HashMap - Python', 'KLlXCFG5TnA', 'NeetCode', 'Walk through a classic array and hash map interview problem.', 'SOFTWARE_DEVELOPMENT', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('software-development-WTzjTskDFMg', 'Valid Parentheses - Stack - Leetcode 20 - Python', 'WTzjTskDFMg', 'NeetCode', 'Practice using a stack to solve a common coding interview problem.', 'SOFTWARE_DEVELOPMENT', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('data-analytics-ZHaYOC0H5KE', 'Solving Easy SQL Interview Questions on Analyst Builder', 'ZHaYOC0H5KE', 'Alex The Analyst', 'Work through beginner SQL technical interview questions step by step.', 'DATA_ANALYTICS', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('data-analytics-fT-8mRf_-Hk', 'Solving Medium SQL Interview Questions on Analyst Builder', 'fT-8mRf_-Hk', 'Alex The Analyst', 'Practise medium SQL interview questions and explain your query logic.', 'DATA_ANALYTICS', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('data-analytics-sua7xKN0cPc', 'SQL Interview Questions and Answers for Beginners', 'sua7xKN0cPc', 'Alex The Analyst', 'Review common SQL questions for data analyst interviews.', 'DATA_ANALYTICS', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('design-ui-ux-AmdcTuEJ5o4', 'UI UX Designer Interview Questions And Answers', 'AmdcTuEJ5o4', 'Intellipaat', 'Prepare for UI/UX interviews with questions about design thinking, research, and usability.', 'DESIGN_UI_UX', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('design-ui-ux-BIGx2ohbCY4', 'Build a Website Design Portfolio | Google UX Design Certificate', 'BIGx2ohbCY4', 'Grow with Google', 'Learn how to present UX work and build a clear design portfolio for job applications.', 'DESIGN_UI_UX', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('design-ui-ux-jwCmIBJ8Jtc', 'Figma Tutorial for UI Design - Course for Beginners', 'jwCmIBJ8Jtc', 'freeCodeCamp.org', 'Learn Figma fundamentals, layout, typography, components, and prototyping.', 'DESIGN_UI_UX', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('aptitude-logical-reasoning-V8pzEEA9suE', '5 Step Quantitative Aptitude Preparation Plan', 'V8pzEEA9suE', 'CareerRide', 'Plan quantitative aptitude preparation for placement tests and entrance exams.', 'APTITUDE_LOGICAL_REASONING', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('aptitude-logical-reasoning-hlyal4sR0m8', 'Aptitude Preparation for Placements: Why Aptitude Is Important', 'hlyal4sR0m8', 'Code Step By Step', 'An introduction to aptitude topics and their role in campus placement preparation.', 'APTITUDE_LOGICAL_REASONING', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)),
  ('aptitude-logical-reasoning-iifXCRd3FyA', 'How to Solve Logical Reasoning Placement Tests', 'iifXCRd3FyA', 'CareerRide', 'Practise a timed logical reasoning paper designed around IT placement tests.', 'APTITUDE_LOGICAL_REASONING', CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3));
