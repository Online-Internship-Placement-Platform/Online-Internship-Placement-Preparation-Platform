import { expect, test, type Page } from '@playwright/test';

type TestRole = 'student' | 'admin';

const credentialVariables = {
  student: ['PLAYWRIGHT_STUDENT_EMAIL', 'PLAYWRIGHT_STUDENT_PASSWORD'],
  admin: ['PLAYWRIGHT_ADMIN_EMAIL', 'PLAYWRIGHT_ADMIN_PASSWORD'],
} as const;

async function signInAs(page: Page, role: TestRole) {
  const [emailName, passwordName] = credentialVariables[role];
  const email = process.env[emailName];
  const password = process.env[passwordName];

  if (!email || !password) {
    test.skip(true, 'Configure ' + emailName + ' and ' + passwordName + ' for this E2E flow.');
    throw new Error('Missing Playwright credentials.');
  }

  const destination = role === 'student' ? '/student/dashboard' : '/admin/dashboard';
  await page.goto('/login');
  await page.getByLabel('Email').fill(email);
  await page.locator('input#password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL((url) => url.pathname === destination);
}

test('TC-24: student dashboard becomes interactive within 4 seconds', async ({ page }) => {
  await signInAs(page, 'student');

  const startedAt = performance.now();
  await page.goto('/student/dashboard', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: /Good morning,/ })).toBeVisible({ timeout: 4_000 });
  const browseLink = page.getByRole('link', { name: 'Browse internships' });
  await expect(browseLink).toBeVisible({ timeout: 4_000 });
  await expect(browseLink).toBeEnabled({ timeout: 4_000 });
  await browseLink.click();
  await expect(page).toHaveURL((url) => url.pathname === '/student/internships');
  const elapsed = performance.now() - startedAt;
  console.log(`TC-24 Dashboard: ${elapsed.toFixed(0)} ms (${(elapsed / 1_000).toFixed(3)} s)`);

  expect(elapsed, 'Dashboard readiness and primary interaction took ' + elapsed.toFixed(0) + ' ms').toBeLessThanOrEqual(4_000);
});

test('TC-25: practice-test score and percentage appear within 3 seconds', async ({ page }) => {
  await signInAs(page, 'student');
  await page.goto('/student/assessments', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Web Development/ }).click();

  await expect(page.getByRole('status').filter({ hasText: 'Loading tests' })).toBeHidden({
    timeout: 10_000,
  });
  await expect(page.locator('p[role="alert"]').filter({ hasText: /\S/ })).toBeHidden();

  const practiceCards = page.locator('article').filter({
    has: page.getByRole('button', { name: 'Start practice' }),
  });
  const populatedCards = practiceCards.filter({
    has: page.getByText(/^[1-9]\d* questions?$/),
  });
  test.skip(
    (await populatedCards.count()) === 0,
    'No available Web Development practice test contains questions.',
  );

  const selectedCard = populatedCards.first();
  const testTitle = await selectedCard.getByRole('heading', { level: 3 }).innerText();
  await selectedCard.getByRole('button', { name: 'Start practice' }).click();

  const practiceTest = page.locator('section[aria-labelledby="active-test-heading"]');
  await expect(practiceTest.getByRole('heading', { name: testTitle })).toBeVisible();
  const questionFields = practiceTest.locator('fieldset');
  const questionCount = await questionFields.count();
  test.skip(questionCount === 0, 'The selected Web Development practice test has no questions.');
  await expect(questionFields.first()).toBeVisible();

  for (const question of await questionFields.all()) {
    await question.getByRole('radio').first().check();
  }

  const startedAt = performance.now();
  await practiceTest.getByRole('button', { name: 'Submit answers' }).click();
  const scoreSummary = practiceTest.getByRole('status').filter({ hasText: 'You scored' });
  await expect(scoreSummary).toBeVisible({ timeout: 3_000 });
  const elapsed = performance.now() - startedAt;
  console.log(`TC-25 Score calculation: ${elapsed.toFixed(0)} ms (${(elapsed / 1_000).toFixed(3)} s)`);

  const correctCount = await Promise.all(
    (await questionFields.all()).map((question) =>
      question.getByText('✓ Correct', { exact: true }).count(),
    ),
  ).then((counts) => counts.reduce((total, count) => total + count, 0));
  const percentage = (correctCount / questionCount) * 100;
  const displayedPercentage =
    percentage % 1 === 0 ? percentage.toFixed(0) : percentage.toFixed(1);

  await expect(scoreSummary).toContainText(
    `You scored ${correctCount} / ${questionCount} (${displayedPercentage}%)`,
  );
  expect(
    elapsed,
    'Practice-test scoring and result display took ' + elapsed.toFixed(0) + ' ms',
  ).toBeLessThanOrEqual(3_000);
});

test('TC-26: client-side internship filtering updates within 3 seconds (initial API load excluded)', async ({ page }) => {
  await signInAs(page, 'student');

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === '/api/internships' && response.request().method() === 'GET';
  });
  await page.goto('/student/internships', { waitUntil: 'domcontentloaded' });
  const response = await responsePromise;
  expect(response.ok(), 'Internship listing API should load successfully').toBeTruthy();
  const result = await response.json() as { internships?: unknown[] };
  const listingCount = Array.isArray(result.internships) ? result.internships.length : 0;
  test.skip(listingCount === 0, 'No visible internship records are available to filter.');

  const region = page.getByRole('region', { name: 'Internship opportunities' });
  const rows = region.getByRole('link');
  await expect(rows).toHaveCount(listingCount, { timeout: 5_000 });
  const search = page.getByPlaceholder('Search company, role, skill...');

  const startedAt = performance.now();
  await search.fill('__tc26_no_matching_internship__');
  await expect(region.getByText('No internships match your filters.', { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(rows).toHaveCount(0, { timeout: 3_000 });
  const elapsed = performance.now() - startedAt;
  console.log(`TC-26 Internship filtering: ${elapsed.toFixed(0)} ms (${(elapsed / 1_000).toFixed(3)} s)`);

  expect(elapsed, 'Internship filter update took ' + elapsed.toFixed(0) + ' ms').toBeLessThanOrEqual(3_000);
});

test('TC-27: client-side question-bank filtering updates within 3 seconds', async ({ page }) => {
  await signInAs(page, 'admin');
  await page.goto('/admin/assessments', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Web Development/ }).click();

  const bank = page.getByRole('region', { name: 'Question bank' });
  const loading = bank.getByRole('status').filter({ hasText: 'Loading question bank' });
  await expect(loading).toBeHidden({ timeout: 10_000 });
  await expect(page.getByText(/Could not load (?:the )?question bank/i)).toBeHidden();
  const noQuestions = bank.getByText('No questions yet. Add a question to begin building the bank.', { exact: true });
  test.skip(await noQuestions.isVisible(), 'No question-bank records are available to filter.');
  const questionHeadings = bank.getByRole('heading', { level: 4 });
  await expect(questionHeadings.first()).toBeVisible({ timeout: 5_000 });

  const search = bank.getByRole('textbox', { name: 'Search questions' });
  const startedAt = performance.now();
  await search.fill('__tc27_no_matching_question__');
  await expect(bank.getByText('No questions match these filters.', { exact: true })).toBeVisible({ timeout: 3_000 });
  await expect(questionHeadings).toHaveCount(0, { timeout: 3_000 });
  const elapsed = performance.now() - startedAt;
  console.log(`TC-27 Question-bank filtering: ${elapsed.toFixed(0)} ms (${(elapsed / 1_000).toFixed(3)} s)`);

  expect(elapsed, 'Question-bank filter update took ' + elapsed.toFixed(0) + ' ms').toBeLessThanOrEqual(3_000);
});
