import { expect, test, type Page } from '@playwright/test';

const draft = (futureBaseline?: { cropId: string; confirmed: true }) => ({ version: 1, savedAt: '2026-11-12T15:00:00.000Z', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], futureBaseline, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' } });

async function openMoreOptions(page: Page) {
  const details = page.locator('details', { hasText: 'Mais opções' });
  if ((await details.getAttribute('open')) === null) await details.locator('summary').click();
}
async function openTechnicalDetails(page: Page) {
  // Dense technical detail lives in collapsible <details data-technical> inside each result block; open them all.
  await page.waitForSelector('details[data-technical]');
  await page.evaluate(() => document.querySelectorAll('details[data-technical]').forEach((item) => item.setAttribute('open', '')));
}
async function installDraft(page: Page, futureBaseline?: { cropId: string; confirmed: true }) { await page.addInitScript((saved) => window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)), draft(futureBaseline)); }

const climateOk = { status: 'ok', origin: 'live', climateSummary: { monthly: [{ month: 11, tmeanMedianC: 25, precipMedianMm: 4, validTemperatureDays: 450, validPrecipitationDays: 450 }], plantingMonthPrecipitation: { month: 11, medianTotalMm: 124, validYears: 15, expectedYears: 15, coveragePct: 100 }, historicalPrecipitationByMonth: [{ month: 11, medianTotalMm: 124, validYears: 15, expectedYears: 15, coveragePct: 100 }], waterContext: { month: 11, imergMedianTotalMm: 130, medianRainDays: 12, rootZoneWetnessMedian: 0.64, validImergYears: 15, expectedYears: 15, imergCoveragePct: 100, rootZoneCoveragePct: 100 }, calendarDayContext: { month: 11, day: 14, tmeanMedianC: 25, precipMedianMm: 4, imergPrecipMedianMm: 3.5, rootZoneWetnessMedian: 0.64, validYears: 15, expectedYears: 15 } }, provenance: { sourceUrl: 'https://example.test/nasa', period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', coveragePct: { T2M: 100, PRECTOTCORR: 100 }, missingDays: [] }, warnings: [] };

test('offers one home path: start the farm analysis with João', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Analisar minha fazenda' }).click();
  await expect(page.getByRole('heading', { name: 'Cadastre a sua fazenda com o João' })).toBeVisible();
  await expect(page.getByText('Sua análise em 4 passos')).toBeVisible();
  await expect(page.getByText('1/4 · Localização')).toBeVisible();
});

test('keeps coordinate entry available when the map is unavailable', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  await openMoreOptions(page);
  await page.getByRole('button', { name: 'Rio Verde (GO), zona rural' }).click();
  const canvas = page.locator('.atlas-map.leaflet-container');
  if (await canvas.count()) {
    await canvas.click({ position: { x: 240, y: 150 } });
    await expect(page.getByLabel('Latitude')).not.toHaveValue('');
    await expect(page.getByLabel('Longitude')).not.toHaveValue('');
  } else {
    await expect(page.getByRole('status').filter({ hasText: 'Mapa interativo indisponível neste navegador' })).toBeVisible();
    await page.getByLabel('Latitude').fill('5.6037');
    await page.getByLabel('Longitude').fill('-0.187');
    await page.getByRole('button', { name: 'Ir ao ponto' }).click();
    await expect(page.getByRole('list', { name: 'Chuva e temperatura típicas por mês' })).toBeVisible();
  }
});

test('shows the NASA soil-moisture layer with its date and draws an exploratory area', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  const soilLayer = page.getByRole('button', { name: 'Umidade do solo', exact: true });
  await soilLayer.click();
  await expect(soilLayer).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText(/Umidade do solo \(zona radicular\) em .* · NASA SMAP/)).toBeVisible();
  const canvas = page.locator('.atlas-map.leaflet-container');
  await expect(canvas).toBeVisible();
  await openMoreOptions(page);
  await page.getByRole('button', { name: 'Desenhar área exploratória' }).click();
  await canvas.click({ position: { x: 220, y: 150 } });
  await canvas.click({ position: { x: 260, y: 190 } });
  await canvas.click({ position: { x: 190, y: 205 } });
  await page.getByRole('button', { name: 'Encerrar área' }).click();
  await expect(page.getByText(/não confirma propriedade/)).toBeVisible();
});

test('opens a consistent mobile menu and starts the Brazil demonstration in one action', async ({ page }) => {
  test.setTimeout(60_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu', exact: true });
  await expect(menu).toBeVisible({ timeout: 30_000 });
  const exploreLink = page.getByRole('link', { name: 'Explorar', exact: true });
  await expect(async () => {
    await menu.click();
    await expect(exploreLink).toBeVisible({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await menu.click();
  await expect(exploreLink).toBeHidden();
  await page.getByRole('button', { name: 'Ver demonstração Brasil' }).click();
  await expect(page).toHaveURL(/\/results\?demo=brasil/);
  await expect(page.getByText('Demonstração Brasil', { exact: true })).toBeVisible();
  await openTechnicalDetails(page);
  const soilSummary = page.getByRole('heading', { name: 'Contexto do solo em 30 segundos' }).locator('..');
  await expect(soilSummary).toContainText('Textura');
  await expect(soilSummary).toContainText('pH em água');
  await expect(soilSummary).toContainText('Carbono orgânico');
  await expect(soilSummary).toContainText('Umidade radicular');
  await expect(soilSummary.getByText('Fontes, método e propriedades adicionais')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Leve esta conversa adiante' })).toBeVisible();
});

test('persists a real English language selection for landing and methodology', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'English' }).click();
  await expect(page.getByRole('link', { name: 'Analyze my farm' })).toBeVisible();
  await page.getByRole('link', { name: 'Methodology' }).click();
  await expect(page.getByRole('heading', { name: 'Method and limits' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Method and limits' })).toBeVisible();
});

test('selects Brazil, Ghana, and India examples globally and updates the coordinates and climate HUD', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  await openMoreOptions(page);
  await page.getByRole('button', { name: 'Rio Verde (GO), zona rural' }).click();
  await expect(page.getByLabel('Latitude')).toHaveValue('-17.9');
  await page.getByRole('button', { name: 'Acra, Gana' }).click();
  await expect(page.getByLabel('Latitude')).toHaveValue('5.6037');
  await page.getByRole('button', { name: 'Nova Délhi, Índia' }).click();
  await expect(page.getByLabel('Longitude')).toHaveValue('77.209');
  await expect(page.getByRole('list', { name: 'Chuva e temperatura típicas por mês' })).toBeVisible();
  await expect(page.getByText('NASA POWER · 2011–2025 · mediana', { exact: true })).toBeVisible();
  const dataPanel = page.locator('#explore-data-panel');
  await expect(dataPanel.getByRole('heading', { name: 'Nova Délhi, Índia' })).toBeVisible();
  await expect(dataPanel.getByRole('img', { name: 'Chuva e temperatura típicas por mês' })).toBeVisible();
  await expect(dataPanel.getByText(/NASA POWER · 2011–2025 · mediana dos anos históricos/)).toBeVisible();
});

test('shows retryable NASA failure without a fabricated climate metric', async ({ page }) => {
  let climateRequests = 0;
  await page.route('**/api/climate*', (route) => {
    climateRequests += 1;
    return route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ status: 'error', code: 'NASA_REQUEST_FAILED', message: 'NASA indisponível.' }) });
  });
  await page.goto('/explore');
  await openMoreOptions(page);
  await page.getByRole('button', { name: 'Acra, Gana' }).click();
  const dataPanel = page.locator('#explore-data-panel');
  await expect(dataPanel.getByText('NASA indisponível.', { exact: true })).toBeVisible();
  const retry = dataPanel.getByRole('button', { name: 'Tentar novamente' });
  const requestsBeforeRetry = climateRequests;
  await retry.click();
  await expect.poll(() => climateRequests).toBeGreaterThan(requestsBeforeRetry);
  await expect(retry).toBeVisible();
});

test('renders provenance and source drawers for pilot analysis', async ({ page }) => {
  test.setTimeout(25_000);
  await installDraft(page);
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Comparação de estratégias', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comparar critérios' })).toBeVisible();
  await expect(page.getByText('Indicadores disponíveis lado a lado.')).toBeVisible();
  const waterEvidenceRow = page.getByRole('row').filter({ has: page.getByRole('rowheader', { name: 'Resposta hídrica documentada' }) });
  await expect(waterEvidenceRow).toBeVisible();
  await expect(waterEvidenceRow.getByText(/pico Kc \d[,.]\d+/i).first()).toBeVisible();
  await expect(waterEvidenceRow.getByText(/não calcula ETc/i).first()).toBeVisible();
  await openTechnicalDetails(page);
  await expect(page.getByRole('heading', { name: 'NASA Insight' })).toBeVisible();
  await page.getByLabel('Mês explorado').selectOption('5');
  await expect(page.getByText(/trocar o mês aqui não altera culturas/i)).toBeVisible();
  const evidenceTrigger = page.getByRole('button', { name: /Evidências ·/ });
  await evidenceTrigger.click();
  await expect(page.getByRole('dialog', { name: 'Centro de Evidências' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Camadas de dados' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Centro de Evidências' })).toHaveCount(0);
  await expect(evidenceTrigger).toBeFocused();
  await page.getByText('Detalhes técnicos de clima e contexto regional').click();
  await expect(page.getByText('Clima histórico NASA')).toBeVisible();
  await page.getByText('Ver gráfico climático de 12 meses').click();
  await expect(page.getByText('Climatologia mensal: temperatura média diária mediana (°C)')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exportar resumo técnico' }).click();
  expect((await download).suggestedFilename()).toMatch(/^field-shift-.*\.md$/);
  await expect(page.getByRole('link', { name: 'Editar linha de base' }).first()).toBeVisible();
});

test('shows forecast provenance and never turns an unvalidated ML experiment into a probability', async ({ page }) => {
  await installDraft(page);
  await page.route('**/api/climate-risk*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ status: 'ok', forecast: { source: 'Open-Meteo Forecast API', sourceUrl: 'https://example.test/forecast', issuedAt: '2026-11-14T00:00:00.000Z', model: 'best_match', timezone: 'UTC', horizonDays: 16, limitations: [] }, waterPressure: { sevenDays: { horizonDays: 7, precipitationTotalMm: 12, et0TotalMm: 24, climateBalanceMm: -12, negativeBalanceDays: 5, validDays: 7, expectedDays: 7, historicalEquivalentBalanceMm: -8, historicalComparison: 'drier_than_historical', limitations: [] }, fifteenDays: { horizonDays: 15, precipitationTotalMm: 20, et0TotalMm: 50, climateBalanceMm: -30, negativeBalanceDays: 11, validDays: 15, expectedDays: 15, historicalEquivalentBalanceMm: -18, historicalComparison: 'drier_than_historical', limitations: [] } }, drySpell: [{ horizonDays: 7, validationStatus: 'not_validated', climatologyReference: 0.4, probability: null, evaluation: { baseline: { brierScore: 0.1 }, model: { brierScore: 0.11 } }, limitations: [] }], strategyExposure: { status: 'not_applicable', reason: 'Sem calendário.' } }) }));
  await page.goto('/results');
  await openTechnicalDetails(page);
  await expect(page.getByRole('heading', { name: 'Climate Risk Lab' })).toBeVisible();
  await expect(page.getByText('Open-Meteo Forecast API')).toBeVisible();
  await expect(page.getByText('probabilidade de IA não divulgada')).toBeVisible();
  await page.getByText('Ver detalhes').first().click();
  await expect(page.getByText('não validado frente à climatologia')).toBeVisible();
  await expect(page.getByText('12 mm', { exact: true })).toBeVisible();
  await expect(page.getByText('Não há inferência de exposição futura específica por estratégia.')).toBeVisible();
});

test('uses static review art when reduced motion is requested', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await installDraft(page);
  await page.goto('/results');
  const transition = page.getByRole('img', { name: /três hipóteses entram em revisão/i });
  await expect(transition).toBeVisible();
  await expect(transition).toHaveCSS('background-image', /transition-review-static/);
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
  await expect(page.getByRole('status').filter({ hasText: 'Rascunho da fazenda salvo' })).toBeVisible();
  await page.getByRole('link', { name: 'Revisar comparação' }).click();
  await expect(page.getByRole('heading', { name: 'Comparação de estratégias', level: 1 })).toBeVisible();
  await expect(page.getByRole('main')).toContainText('girassol');
  await expect(page.locator('[data-scenario="A"]').getByLabel('Sequência de 2 anos')).toBeVisible();
});

test('migrates a V1 draft on the farm timeline and preserves its data at 375px', async ({ page }) => {
  await installDraft(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/farm/historico');
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
  await expect(page.getByRole('button', { name: /Evidências ·/ })).toBeVisible();
  await page.getByText('Editar sequência de 4 slots').first().click();
  const choose = page.getByRole('button', { name: 'Trocar cultura' }).nth(1);
  await choose.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Escolher cultura para slot' })).toBeVisible();
  await page.getByRole('button', { name: /feijão-caupi/i }).click();
  await expect(page.locator('.field-slot-updated')).toContainText('feijão-caupi');
  await expect(page.getByRole('status', { name: 'Efeito da alteração do slot' })).toContainText(/Mudou|permaneceram iguais/);
  await page.getByRole('button', { name: 'Ver evidências' }).click();
  const evidence = page.getByRole('dialog', { name: 'Centro de Evidências' });
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/cenário A, slot 2/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar evidências' }).click();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Última alteração desfeita.' })).toBeVisible();
  await expect(page.locator('.field-slot-updated')).toHaveCount(0);
  await expect(page.getByLabel('Três cenários do laboratório').getByRole('tabpanel')).toHaveCount(3);
});

test('blocks overlapping timeline dates and allows another crop entry', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm/historico');
  await page.getByRole('button', { name: /2\. milho/ }).click();
  await page.getByText('Outra cultura', { exact: true }).click();
  await page.getByLabel('Outra cultura do evento 2').fill('mandioca');
  await page.getByLabel('Início (mês/ano) do evento 2').fill('2023-05');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Os eventos devem ser cronológicos e sem sobreposição.')).toBeVisible();
  await expect(page.getByLabel('Início (mês/ano) do evento 2')).toHaveAttribute('aria-invalid', 'true');
});

test('explains invalid month fields and confirms a save without navigating away', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm/historico');
  await page.getByRole('button', { name: /2\. milho/ }).click();
  const start = page.getByLabel('Início (mês/ano) do evento 2');
  await start.fill('');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Informe mês e ano, por exemplo 2024-06.').first()).toBeVisible();
  await start.fill('2023-07');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo neste dispositivo às');
  await expect(page).toHaveURL(/\/farm\/historico$/);
});

test('starts with one history event and lets the producer add or remove optional events', async ({ page }) => {
  const oneEvent = draft();
  oneEvent.data.history = [oneEvent.data.history[0]];
  await page.addInitScript((saved) => window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)), oneEvent);
  await page.goto('/farm/historico');
  await expect(page.getByRole('heading', { name: 'Histórico recente de cultivos' })).toBeVisible();
  await expect(page.getByRole('button', { name: /1\. soja/ })).toBeVisible();
  await expect(page.getByRole('button', { name: /2\./ })).toHaveCount(0);
  await page.getByRole('button', { name: 'Adicionar evento' }).click();
  await expect(page.getByRole('button', { name: 'Remover evento 2' })).toBeVisible();
  await page.getByRole('button', { name: 'Remover evento 2' }).click();
  await expect(page.getByRole('button', { name: 'Remover evento 2' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo neste dispositivo');
});

test('keeps the core farm, laboratory, and results flow in English', async ({ page }) => {
  await installDraft(page);
  await page.addInitScript(() => window.localStorage.setItem('field-shift:locale', 'en'));
  await page.goto('/farm/historico');
  await expect(page.getByRole('heading', { name: 'Farm timeline' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Recent crop history' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save and open laboratory' })).toBeVisible();
  await page.goto('/lab');
  await expect(page.getByRole('heading', { name: 'Rotation laboratory' })).toBeVisible();
  await expect(page.getByText('Crops accepted for alternatives')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Review comparison' })).toBeVisible();
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Strategy comparison' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Compare criteria' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Take this conversation forward' })).toBeVisible();
  await expect(page.getByText('Prioridades em destaque:')).toHaveCount(0);
});

test('shows three stacked global scenarios and unknown climate after NASA failure', async ({ page }) => {
  await installDraft(page);
  await page.route('**/api/analyze', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ input: draft().data, climate: { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: ['NASA indisponível para esta coordenada.'] }, regionalContext: { country: null, municipality: null, municipalitySource: null, zarc: null, gaps: ['Fora do Brasil.'] }, warnings: ['NASA indisponível para esta coordenada.'], regionalContextAvailable: false, disclaimer: 'Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.', priorityHighlights: ['historical_precipitation', 'cover_potential', 'functional_diversity'], nasaInsight: { status: 'unknown', month: 4, metric: 'unavailable', observedValue: null, unit: null, period: null, coveragePct: null, changesComparison: false, effects: [], attentionDecision: null, limitations: ['NASA indisponível para esta coordenada.'], sourceUrl: null }, nasaInsightByMonth: [], boundaryAnalysis: { status: 'not_provided', vertexCount: 0, areaHa: null, centroid: null, smapHistorical: { product: 'SPL4SMGP', version: 8, temporalCoverage: '2015-03-31/present', temporalResolution: '3 hours', nominalResolutionKm: 9, numericStatus: 'requires_earthdata_preprocessing', spatialInterpretation: 'no_boundary', sourceUrl: 'https://example.test/smap' } }, strategies: ['A', 'B', 'C'].map((id) => ({ id, title: `Cenário ${id}`, baseline: id === 'A', baselineAssumed: id === 'A', horizonMonths: 24, proposedCrop: null, validationLevel: 'climate_exploration', regionalContextAvailable: false, indicators: [], explanations: [], missingData: ['historical_climate'], unavailable: true })) }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/results');
  await openTechnicalDetails(page);
  await page.getByText('Detalhes técnicos de clima e contexto regional').click();
  await expect(page.getByText('Indisponível: cenários preservados com métricas climáticas desconhecidas.')).toBeVisible();
  const cards = page.getByLabel('Estratégias exploratórias').locator('article');
  await expect(cards).toHaveCount(3);
  const y = await cards.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
  expect(y[0]).toBeLessThan(y[1]);
  expect(y[1]).toBeLessThan(y[2]);
});

test('compares scenarios with mobile tabs on a 375px viewport', async ({ page }) => {
  await installDraft(page);
  await page.setViewportSize({ width: 375, height: 844 });
  await page.goto('/results');
  await expect(page.getByRole('tab', { name: 'Cenário A' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('tab', { name: 'Cenário B' }).click();
  await expect(page.getByRole('tab', { name: 'Cenário B' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel').getByRole('heading', { name: /B\./ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao laboratório' })).toBeVisible();
});

test('builds a 2–3 crop system with drag, validates chronology, and persists it', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm/historico');
  const systems = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Sistemas de cultivo (opcional)' }) });
  await expect(systems.locator('img[alt*="mandioca" i]').first()).toHaveAttribute('src', /cassava\.png/);
  await systems.getByRole('button', { name: 'Adicionar sistema composto' }).click();
  const card = systems.getByRole('button', { name: /mandioca.*Arraste para um sistema/i });
  const system = systems.locator('article').first();
  const transfer = await page.evaluateHandle(() => new DataTransfer());
  await card.dispatchEvent('dragstart', { dataTransfer: transfer });
  await system.dispatchEvent('dragover', { dataTransfer: transfer });
  await system.dispatchEvent('drop', { dataTransfer: transfer });
  await expect(system.getByLabel('Cultura')).toHaveCount(3);
  await system.getByLabel('Tipo de sistema').selectOption('succession');
  const starts = system.getByLabel('Início');
  const ends = system.getByLabel('Fim');
  await starts.nth(0).fill('2026-01'); await ends.nth(0).fill('2026-04');
  await starts.nth(1).fill('2026-03'); await ends.nth(1).fill('2026-06');
  await starts.nth(2).fill('2026-07'); await ends.nth(2).fill('2027-06');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Os eventos devem ser cronológicos e sem sobreposição.')).toBeVisible();
  await starts.nth(1).fill('2026-05');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo neste dispositivo');
  const stored = await page.evaluate(() => JSON.parse(window.localStorage.getItem('field-shift:draft') ?? '{}').data.croppingSystems[0]);
  expect(stored).toMatchObject({ type: 'succession', events: [{ startYearMonth: '2026-01' }, { startYearMonth: '2026-05' }, { cropId: 'cassava' }] });
});
