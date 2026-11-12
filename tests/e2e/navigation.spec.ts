import { expect, test } from '@playwright/test';

test('navigates from home to the exploration foundation', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Começar exploração' }).click();
  await expect(page.getByRole('heading', { name: 'Localização' })).toBeVisible();
});

test('renders global exploratory pilot analysis from a valid local draft', async ({ page }) => {
  test.setTimeout(25_000);
  await page.addInitScript(() => {
    window.localStorage.setItem('field-shift:draft', JSON.stringify({
      version: 1,
      savedAt: '2026-11-12T15:00:00.000Z',
      data: {
        location: { latitude: -17.798, longitude: -50.919 },
        plantingMonth: 4,
        history: [
          { cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' },
          { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' },
          { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' },
        ],
        priorities: { water: 1, soil: 1, operations: 1 },
        irrigation: 'unknown',
      },
    }));
  });
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Continuidade presumida — confirmar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Saúde do solo' })).toBeVisible();
  await expect(page.getByText('Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.')).toBeVisible();
});
