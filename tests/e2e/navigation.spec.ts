import { expect, test } from '@playwright/test';

test('navigates from home to the exploration foundation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Começar exploração' }).click();
  await expect(page.getByRole('heading', { name: 'Localização' })).toBeVisible();
});
