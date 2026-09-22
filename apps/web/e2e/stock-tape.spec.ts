import { test, expect } from '@playwright/test';

test('stock tape spans the top of the terminal', async ({ page }) => {
  await page.goto('/dashboard');
  if (page.url().includes('/login')) {
    test.skip(true, 'Sign-in required for the research terminal');
    return;
  }
  const tape = page.getByLabel('Live stock tape');
  await expect(tape).toBeVisible();
  await expect(tape.getByRole('link', { name: /NIFTY 50/ })).toBeVisible();
  await page.goto('/market');
  await expect(page.getByLabel('Live stock tape')).toBeVisible();
});
