import { test, expect } from '@playwright/test';

test('dashboard renders the research terminal', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page.getByText('Bloom')).toBeVisible();
  await expect(page.getByText('Today’s Best Trade')).toBeVisible();
  await expect(page.getByRole('link', { name: /Today’s Best Trade/ })).toBeVisible();
});
