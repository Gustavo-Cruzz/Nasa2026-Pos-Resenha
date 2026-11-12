import { expect, test, type Page } from '@playwright/test';

const draft = (futureBaseline?: { cropId: string; confirmed: true }) => ({ version: 1, savedAt: '2026-11-12T15:00:00.000Z', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], futureBaseline, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' } });
async function installDraft(page: Page, futureBaseline?: { cropId: string; confirmed: true }) { await page.addInitScript((saved) => window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)), draft(futureBaseline)); }

const climateOk = { status: 'ok', origin: 'live', climateSummary: { monthly: [{ month: 1, tmeanMedianC: 25, precipMedianMm: 4, validTemperatureDays: 31, validPrecipitationDays: 31 }], plantingMonthPrecipitation: { month: 1, medianTotalMm: 124, validYears: 15, expectedYears: 15, coveragePct: 100 } }, provenance: { sourceUrl: 'https://example.test/nasa', period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', coveragePct: { T2M: 100, PRECTOTCORR: 100 }, missingDays: [] }, warnings: [] };

test('navigates from home to the global atlas with coordinate fallback', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Começar exploração' }).click();
  await expect(page.getByRole('heading', { name: 'Atlas climático global' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Mapa mundial indisponível sem estilo autorizado/ })).toBeVisible();
});

test('selects Brazil, Ghana, and India globally then transfers coordinates to farm', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Rio Verde (GO), Brasil' }).click();
  await expect(page.getByLabel('Latitude')).toHaveValue('-17.798');
  await page.getByRole('button', { name: 'Acra, Gana' }).click();
  await expect(page.getByLabel('Latitude')).toHaveValue('5.6037');
  await page.getByRole('button', { name: 'Nova Délhi, Índia' }).click();
  await expect(page.getByLabel('Longitude')).toHaveValue('77.209');
  await expect(page.getByText('Clima histórico observado')).toBeVisible();
  await page.getByRole('button', { name: 'Usar este local na minha fazenda' }).click();
  await expect(page.getByRole('heading', { name: 'Localização' })).toBeVisible();
  await expect(page.getByText('Local do atlas aplicado. Complete os dados da fazenda.')).toBeVisible();
});

test('shows retryable NASA failure without a fabricated climate metric', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error', code: 'NASA_REQUEST_FAILED', message: 'NASA indisponível.' }) }));
  await page.goto('/explore');
  await page.getByRole('button', { name: 'Acra, Gana' }).click();
  await expect(page.getByText('NASA indisponível.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Tentar novamente' })).toBeVisible();
});

test('renders provenance and source drawers for pilot analysis', async ({ page }) => {
  test.setTimeout(25_000);
  await installDraft(page);
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Continuidade presumida — confirmar' })).toBeVisible();
  await expect(page.getByText('Climatologia mensal: temperatura média diária mediana (°C)')).toBeVisible();
  await page.getByText('Proveniência climática').click();
  await expect(page.getByText('NASA POWER:', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar linha de base' })).toBeVisible();
});

test('edits confirmed baseline through the result link using the keyboard', async ({ page }) => {
  test.setTimeout(25_000);
  await installDraft(page, { cropId: 'maize', confirmed: true });
  await page.goto('/results');
  const edit = page.getByRole('link', { name: 'Editar linha de base' });
  await edit.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'Revisar' })).toBeVisible();
  await expect(page.getByLabel('Cultura planejada')).toHaveValue('maize');
  await page.getByLabel('Cultura planejada').selectOption('sunflower');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('heading', { name: 'Plano do produtor' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Plano do produtor' })).toContainText('girassol');
});

test('shows three stacked global scenarios and unknown climate after NASA failure', async ({ page }) => {
  await installDraft(page);
  await page.route('**/api/analyze', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ input: draft().data, climate: { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: ['NASA indisponível para esta coordenada.'] }, warnings: ['NASA indisponível para esta coordenada.'], regionalContextAvailable: false, disclaimer: 'Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.', priorityHighlights: ['historical_precipitation', 'cover_potential', 'functional_diversity'], strategies: ['A', 'B', 'C'].map((id) => ({ id, title: `Cenário ${id}`, baseline: id === 'A', baselineAssumed: id === 'A', horizonMonths: 24, proposedCrop: null, validationLevel: 'climate_exploration', regionalContextAvailable: false, indicators: [], explanations: [], missingData: ['historical_climate'], unavailable: true })) }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/results');
  await expect(page.getByText('Indisponível: cenários preservados com métricas climáticas desconhecidas.')).toBeVisible();
  const headings = page.getByRole('heading', { name: /Cenário [ABC]/ });
  await expect(headings).toHaveCount(3);
  const y = await headings.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
  expect(y[0]).toBeLessThan(y[1]);
  expect(y[1]).toBeLessThan(y[2]);
});
