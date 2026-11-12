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

test('persists a real English language selection for landing and methodology', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Idioma').selectOption('en');
  await expect(page.getByRole('link', { name: 'Start exploring' })).toBeVisible();
  await page.getByRole('link', { name: 'Methodology' }).click();
  await expect(page.getByRole('heading', { name: 'Method and limits' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Method and limits' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: /soja.*Sem evidência local/i })).toBeVisible();
  await page.getByRole('button', { name: /soja.*Sem evidência local/i }).press('Enter');
  await expect(page.getByRole('dialog', { name: 'Detalhes de soja' })).toBeVisible();
  await expect(page.getByText('N/D: faixa térmica verificável não está disponível.')).toHaveCount(0);
  await page.getByRole('button', { name: 'Fechar' }).click();
  await page.getByRole('button', { name: 'Usar este local na minha fazenda' }).click();
  await expect(page.getByRole('heading', { name: 'Localização' })).toBeVisible();
  await expect(page.getByText('Local do atlas aplicado. Complete a linha do tempo.')).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Comparar critérios' })).toBeVisible();
  await expect(page.getByText('ranking ou nota agregada', { exact: false })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Linha do tempo da fazenda' })).toBeVisible();
  await expect(page.getByLabel('Cultura planejada')).toHaveValue('maize');
  await page.getByLabel('Cultura planejada').selectOption('sunflower');
  await page.getByRole('button', { name: 'Salvar e ir ao laboratório' }).click();
  await expect(page.getByRole('heading', { name: 'Laboratório de rotações' })).toBeVisible();
  await expect(page.getByRole('status')).toContainText('Rascunho da fazenda salvo');
  await page.getByRole('link', { name: 'Revisar comparação' }).click();
  await expect(page.getByRole('heading', { name: 'Plano do produtor' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Plano do produtor' })).toContainText('girassol');
});

test('migrates a V1 draft on the farm timeline and preserves its data at 375px', async ({ page }) => {
  await installDraft(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/farm');
  await expect(page.getByRole('heading', { name: 'Linha do tempo da fazenda' })).toBeVisible();
  await expect(page.getByLabel('Início (mês/ano) do evento 1')).toHaveValue('2023-01');
  await page.getByRole('button', { name: 'Salvar e ir ao laboratório' }).click();
  await expect(page).toHaveURL(/\/lab/);
  const version = await page.evaluate(() => JSON.parse(window.localStorage.getItem('field-shift:draft') ?? '{}').version);
  expect(version).toBe(2);
});

test('edits a laboratory slot by keyboard without inventing a calendar', async ({ page }) => {
  await installDraft(page);
  await page.goto('/lab');
  await expect(page.getByRole('heading', { name: 'Laboratório de rotações' })).toBeVisible();
  const choose = page.getByRole('button', { name: 'Escolher cultura' }).nth(1);
  await choose.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Escolher cultura para slot' })).toBeVisible();
  await page.getByRole('button', { name: /feijão-caupi/i }).click();
  await expect(page.getByLabel('Três cenários do laboratório').getByText('feijão-caupi')).toBeVisible();
  await expect(page.getByText(/sem score agregado, ciclo ou janela local/i)).toHaveCount(3);
});

test('blocks overlapping timeline dates and allows another crop entry', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm');
  await page.getByLabel('Outra cultura do evento 2').isHidden().catch(() => undefined);
  await page.getByText('Outra cultura', { exact: true }).nth(1).click();
  await page.getByLabel('Outra cultura do evento 2').fill('mandioca');
  await page.getByLabel('Início (mês/ano) do evento 2').fill('2023-05');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Este evento se sobrepõe ao anterior. Ajuste o início ou fim.')).toBeVisible();
  await expect(page.getByLabel('Início (mês/ano) do evento 2')).toHaveAttribute('aria-invalid', 'true');
});

test('explains invalid month fields and confirms a save without navigating away', async ({ page }) => {
  await installDraft(page);
  await page.addInitScript(() => {
    const saved = JSON.parse(window.localStorage.getItem('field-shift:draft') ?? '{}');
    saved.data.history[1].startYearMonth = '';
    window.localStorage.setItem('field-shift:draft', JSON.stringify(saved));
  });
  await page.goto('/farm');
  const start = page.getByLabel('Início (mês/ano) do evento 2');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Informe mês e ano, por exemplo 2024-06.').first()).toBeVisible();
  await page.getByLabel('Início (mês/ano) do evento 1').fill('2023-01');
  await page.getByLabel('Fim (mês/ano) do evento 1').fill('2023-06');
  await start.fill('2023-07');
  await page.getByLabel('Fim (mês/ano) do evento 2').fill('2023-12');
  await page.getByLabel('Início (mês/ano) do evento 3').fill('2024-01');
  await page.getByLabel('Fim (mês/ano) do evento 3').fill('2024-06');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo neste dispositivo às');
  await expect(page).toHaveURL(/\/farm$/);
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

test('keeps the comparison table scrollable on a 375px viewport', async ({ page }) => {
  await installDraft(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/results');
  const table = page.getByRole('table');
  await expect(table).toBeVisible();
  const scrolls = await table.evaluate((element) => element.parentElement!.scrollWidth > element.parentElement!.clientWidth);
  expect(scrolls).toBe(true);
  await expect(page.getByRole('link', { name: 'Voltar ao laboratório' })).toBeVisible();
});
