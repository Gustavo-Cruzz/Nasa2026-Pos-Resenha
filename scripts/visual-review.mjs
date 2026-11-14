import { chromium } from '@playwright/test';

const draft = { version: 1, savedAt: '2026-11-13T18:00:00.000Z', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' } };
const baseUrl = process.env.FIELD_SHIFT_URL ?? 'http://127.0.0.1:3000';
const browser = await chromium.launch({ headless: true });
for (const viewport of [{ name: 'mobile', width: 390, height: 844 }, { name: 'desktop', width: 1440, height: 900 }]) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  await page.addInitScript((value) => window.localStorage.setItem('field-shift:draft', JSON.stringify(value)), draft);
  for (const route of ['explore', 'farm', 'results', 'methodology']) {
    await page.goto(`${baseUrl}/${route}`, { waitUntil: 'networkidle' });
    if (route === 'explore') {
      await page.getByRole('button', { name: 'Rio Verde (GO), Brasil' }).click();
      await page.getByRole('button', { name: 'Mostrar NASA SMAP' }).click();
      await page.getByRole('button', { name: 'Comparar sinais NASA' }).click();
      await page.getByRole('heading', { name: 'Nova Délhi, Índia' }).waitFor();
    }
    if (route === 'results') await page.getByRole('heading', { name: /Comparar critérios/ }).waitFor();
    await page.screenshot({ path: `/tmp/fieldshift-${route}-${viewport.name}.png`, fullPage: true });
  }
  await context.close();
}
await browser.close();
