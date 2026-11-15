import { expect, test, type Page } from '@playwright/test';

const slots = (crops: Array<string | null>) => crops.map((cropId, index) => ({ year: index < 2 ? 1 : 2, season: index % 2 === 0 ? 'A' : 'B', cropId }));
const labPlan = (a: Array<string | null>) => ({ scenarios: [
  { id: 'A', title: 'Continuidade presumida — confirmar', slots: slots(a) },
  { id: 'B', title: 'Saúde do solo', slots: slots(['cowpea', null, 'maize', 'sunflower']) },
  { id: 'C', title: 'Contexto hídrico', slots: slots(['sorghum', null, null, null]) },
] });
const data = { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }], priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown',
  croppingSystems: [{ plotId: 'talhao-1', type: 'intercrop', validation: 'user_defined', events: [{ cropId: 'maize', startYearMonth: '2025-10', endYearMonth: '2026-03' }, { cropId: 'cowpea', startYearMonth: '2025-11', endYearMonth: '2026-02' }] }] };
const draft = (a: Array<string | null>) => ({ version: 2, savedAt: '2026-11-14T12:00:00.000Z', data, labPlan: labPlan(a) });
async function installDraft(page: Page, a: Array<string | null>) { await page.addInitScript((saved) => { if (!window.sessionStorage.getItem('ffs-installed')) { window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)); window.sessionStorage.setItem('ffs-installed', '1'); } }, draft(a)); }

test('embeds Future Farm Stories in the simple A/B/C comparison and walks the four cycles', async ({ page }) => {
  test.setTimeout(40_000);
  await installDraft(page, ['maize', 'soybean', 'maize', 'ruziziensis']);
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Explore suas possibilidades' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /João explica o plano A/ })).toHaveAttribute('aria-selected', 'true');
  const steps = page.getByRole('navigation', { name: 'Ciclos do cenário A' });
  await expect(steps.getByRole('button', { name: /Ciclo 1/ })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByTestId('farm-scene')).toHaveAttribute('aria-label', /milho e feijão-caupi/i);
  await expect(page.getByTestId('farm-scene')).toHaveAttribute('data-scene-kind', 'composed');
  await expect(page.getByTestId('scene-legend-item')).toHaveCount(2);
  await expect(page.getByTestId('farm-scene-disclaimer')).toHaveText('Visualização ilustrativa da configuração de culturas; não representa produtividade ou condição real do campo.');
  await page.getByRole('button', { name: 'Próximo ciclo' }).click();
  await expect(steps.getByRole('button', { name: /Ciclo 2/ })).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.ffs-plant[data-crop="soybean"]').first()).toBeAttached();
  await expect(page.locator('.ffs-plant:not([data-crop="soybean"])')).toHaveCount(0);
  await steps.getByRole('button', { name: /Ciclo 2/ }).press('End');
  await expect(steps.getByRole('button', { name: /Ciclo 4/ })).toHaveAttribute('aria-current', 'step');
  await expect(page.getByRole('heading', { name: 'O que este plano pode oferecer' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'O que os dados NASA mostram aqui' })).toBeVisible();
  await page.getByRole('tab', { name: /João explica o plano B/ }).click();
  await expect(page.getByRole('navigation', { name: 'Ciclos do cenário B' }).getByRole('button')).toHaveCount(5); // prev + 3 real stages + next
  await page.getByRole('button', { name: 'Pausar animação' }).click();
  await expect(page.getByTestId('farm-scene')).toHaveAttribute('data-animate', 'false');
  await page.getByRole('tabpanel').getByRole('link', { name: 'Comparar' }).click();
  await expect(page.getByRole('heading', { name: 'Comparar critérios' })).toBeVisible();
});

test('a crop edited after the analysis is drawn immediately, with evidence withheld', async ({ page }) => {
  test.setTimeout(40_000);
  await installDraft(page, ['maize', 'soybean', null, null]);
  await page.goto('/future-stories');
  await expect(page.getByTestId('farm-scene')).toBeVisible();
  await page.evaluate(() => { const saved = JSON.parse(window.localStorage.getItem('field-shift:draft') ?? '{}'); saved.labPlan.scenarios[0].slots[1].cropId = 'sunflower'; window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)); });
  await page.reload();
  await page.getByRole('navigation', { name: 'Ciclos do cenário A' }).getByRole('button', { name: /Ciclo 2/ }).click();
  await expect(page.getByTestId('farm-scene')).toHaveAttribute('aria-label', /girassol/i);
  await expect(page.locator('.ffs-plant[data-crop="soybean"]')).toHaveCount(0);
  await expect(page.getByText(/alterada depois da última análise/)).toBeVisible();
});

test('reduced motion and demo mode use static PNG and stay isolated from the farm', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/future-stories?demo=ilustrativa');
  await expect(page.getByTestId('demo-banner')).toBeVisible();
  await expect(page.getByTestId('farm-scene')).toHaveAttribute('data-scene-kind', 'demo');
  await expect(page.getByTestId('demo-static')).toHaveAttribute('src', '/assets/farm-stories/scenes/scenario-a-cycle-1.png');
  await expect(page.locator('img[src$=".gif"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.localStorage.getItem('field-shift:draft'))).toBeNull();
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.reload();
  await expect(page.locator('picture source[type="image/webp"]')).toHaveAttribute('srcset', '/assets/farm-stories/scenes/scenario-a-cycle-1.webp');
  await expect(page.locator('img[src$=".gif"]')).toHaveCount(1);
});

test('mobile layout keeps the scene above the stepper and panel', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/future-stories?demo=ilustrativa');
  const scene = await page.getByTestId('farm-scene').boundingBox();
  const panel = await page.getByRole('heading', { name: 'Riscos e incertezas' }).boundingBox();
  expect(scene && panel && scene.y < panel.y).toBe(true);
  expect(scene && Math.abs(scene.width / scene.height - 16 / 9) < 0.02).toBe(true);
});
