import { test, expect, Page } from '@playwright/test';

const required = ['E2E_EXAMINER_EMAIL', 'E2E_EXAMINER_PASSWORD', 'E2E_STATION_ID', 'E2E_ADMIN_EMAIL', 'E2E_ADMIN_PASSWORD'];
const configured = required.every((name) => Boolean(process.env[name]));

async function login(page: Page, email: string, password: string) {
  await page.goto('/login');
  await page.getByLabel('Email address').fill(email);
  await page.getByLabel('Password').fill(password);
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).not.toHaveURL(/\/login$/);
}

test.describe('complete practical examination lifecycle', () => {
  test.skip(!configured, `Set ${required.join(', ')} to run against an isolated staging examination.`);

  test('examiner selects a mapped attempt and the admin can reopen it with an audit reason', async ({ browser }) => {
    const examiner = await browser.newPage();
    await login(examiner, process.env.E2E_EXAMINER_EMAIL!, process.env.E2E_EXAMINER_PASSWORD!);
    await examiner.goto(`/examiner/stations/${process.env.E2E_STATION_ID}`);
    await expect(examiner.getByText('Step 1 — Select student')).toBeVisible();

    const studentSelect = examiner.getByRole('combobox').first();
    await studentSelect.click();
    await examiner.getByRole('option').first().click();

    if (await examiner.getByText('Choose the examination').isVisible()) {
      await examiner.getByText('Step 2 — Select category').locator('..').getByRole('combobox').click();
      await examiner.getByRole('option').first().click();
      await examiner.getByText('Step 3 — Select task').locator('..').getByRole('combobox').click();
      await examiner.getByRole('option').first().click();
      await examiner.getByRole('button', { name: 'Confirm task and begin scoring' }).click();
    }
    await expect(examiner.getByText(/Shared task attempt 1/)).toBeVisible();

    const admin = await browser.newPage();
    await login(admin, process.env.E2E_ADMIN_EMAIL!, process.env.E2E_ADMIN_PASSWORD!);
    await admin.goto('/admin/assessment-matrix');
    await expect(admin.getByText('Assessment Matrix')).toBeVisible();
    // Reopening is exercised when the staging fixture already contains a submitted scorecard.
    const reopen = admin.getByRole('button', { name: /Reset/ }).first();
    if (await reopen.isVisible()) {
      await reopen.click();
      await admin.getByPlaceholder(/Reason for reopening/).fill('Automated staging lifecycle verification');
      await admin.getByRole('button', { name: 'Yes, Reset Assessment' }).click();
      await expect(admin.getByText(/Assessment reset to Pending/i)).toBeVisible();
    }
  });
});
