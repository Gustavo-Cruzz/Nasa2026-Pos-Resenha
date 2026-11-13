import { expect, test, type Page } from '@playwright/test';

const draft = (futureBaseline?: { cropId: string; confirmed: true }) => ({ version: 1, savedAt: '2026-11-12T15:00:00.000Z', data: { location: { latitude: -17.798, longitude: -50.919 }, plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], futureBaseline, priorities: { water: 1, soil: 1, operations: 1 }, irrigation: 'unknown' } });

test('switches the decorative farm scene explicitly and persists the choice', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Noite' }).click();
  await expect(page.getByRole('button', { name: 'Noite' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('img[src*="field-night"]')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('button', { name: 'Noite' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByText('Cena ilustrativa — não é observação da fazenda.')).toBeVisible();
});
async function installDraft(page: Page, futureBaseline?: { cropId: string; confirmed: true }) { await page.addInitScript((saved) => window.localStorage.setItem('field-shift:draft', JSON.stringify(saved)), draft(futureBaseline)); }

const climateOk = { status: 'ok', origin: 'live', climateSummary: { monthly: [{ month: 1, tmeanMedianC: 25, precipMedianMm: 4, validTemperatureDays: 31, validPrecipitationDays: 31 }], plantingMonthPrecipitation: { month: 1, medianTotalMm: 124, validYears: 15, expectedYears: 15, coveragePct: 100 } }, provenance: { sourceUrl: 'https://example.test/nasa', period: { start: '20110101', end: '20251231' }, fetchedAt: '2026-11-12T00:00:00.000Z', coveragePct: { T2M: 100, PRECTOTCORR: 100 }, missingDays: [] }, warnings: [] };

test('navigates from home to the global atlas with its real MapLibre basemap', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.field-atmosphere')).toBeVisible();
  await page.getByRole('link', { name: 'Começar exploração' }).click();
  await expect(page.getByRole('heading', { name: 'Atlas climático global' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Jornada de exploração' }).getByRole('link', { name: 'Explorar' })).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('.atlas-map')).toBeVisible();
  await expect(page.locator('.atlas-map-frame')).toBeVisible();
});

test('keeps coordinate entry available when MapLibre WebGL is unavailable', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  const canvas = page.locator('.atlas-map .maplibregl-canvas');
  if (await canvas.count()) {
    await canvas.click({ position: { x: 240, y: 150 } });
    await expect(page.getByLabel('Latitude')).not.toHaveValue('');
    await expect(page.getByLabel('Longitude')).not.toHaveValue('');
  } else {
    await expect(page.getByRole('status')).toContainText('Mapa interativo indisponível neste navegador');
    await page.getByLabel('Latitude').fill('5.6037');
    await page.getByLabel('Longitude').fill('-0.187');
    await page.getByRole('button', { name: 'Ir ao ponto' }).click();
    await expect(page.getByText('Clima histórico observado')).toBeVisible();
  }
});

test('opens a consistent mobile menu and starts the Brazil demonstration in one action', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByText('Menu', { exact: true }).click();
  await expect(page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Explorar' })).toBeVisible();
  await page.getByRole('button', { name: 'Ver demonstração Brasil' }).click();
  await expect(page).toHaveURL(/\/results\?demo=brasil/);
  await expect(page.getByText('Demonstração Brasil', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Leve esta conversa adiante' })).toBeVisible();
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
  await expect(page.getByRole('button', { name: 'soja' })).toBeVisible();
  await page.getByRole('button', { name: 'soja' }).press('Enter');
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

test('resolves a Brazilian coordinate to municipality-wide ZARC context', async ({ page }) => {
  await page.route('**/api/climate*', (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify(climateOk) }));
  await page.goto('/explore');
  await page.getByLabel('Latitude').fill('-23.5505');
  await page.getByLabel('Longitude').fill('-46.6333');
  await page.getByRole('button', { name: 'Ir ao ponto' }).click();
  await expect(page.getByText(/São Paulo \(SP\), código IBGE 3550308/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'milho' })).toBeVisible();
  await expect(page.getByRole('button', { name: /feijão-comum/i }).locator('img')).toHaveAttribute('src', /common-bean/);
  await expect(page.getByRole('button', { name: /arroz de terras altas/i }).locator('img')).toHaveAttribute('src', /upland-rice/);
  await page.getByRole('button', { name: 'milho' }).click();
  await expect(page.getByRole('dialog', { name: 'Detalhes de milho' })).toContainText('ZARC 2026/2027 disponível para São Paulo');
});

test('renders provenance and source drawers for pilot analysis', async ({ page }) => {
  test.setTimeout(25_000);
  await installDraft(page);
  await page.goto('/results');
  await expect(page.getByRole('heading', { name: 'Continuidade presumida — confirmar' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Comparar critérios' })).toBeVisible();
  await expect(page.getByText('Indicadores disponíveis lado a lado.')).toBeVisible();
  await expect(page.getByText('Climatologia mensal: temperatura média diária mediana (°C)')).toBeVisible();
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
  await page.getByText('Proveniência climática').click();
  await expect(page.getByText('NASA POWER:', { exact: false })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Editar linha de base' })).toBeVisible();
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
  await expect(page.getByRole('heading', { name: 'Plano do produtor' })).toBeVisible();
  await expect(page.getByRole('article').filter({ hasText: 'Plano do produtor' })).toContainText('girassol');
  await expect(page.getByLabel('Sequência do cenário A')).toBeVisible();
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
  await expect(page.getByRole('button', { name: /Evidências ·/ })).toBeVisible();
  await page.getByText('Editar sequência de 4 slots').first().click();
  const choose = page.getByRole('button', { name: 'Escolher cultura' }).nth(1);
  await choose.focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('dialog', { name: 'Escolher cultura para slot' })).toBeVisible();
  await page.getByRole('button', { name: /feijão-caupi/i }).click();
  await expect(page.locator('.field-slot-updated')).toContainText('feijão-caupi');
  await expect(page.getByRole('status', { name: 'Efeito da alteração do slot' })).toContainText(/Mudou|permaneceram iguais/);
  await page.getByRole('button', { name: 'Ver evidências' }).click();
  const evidence = page.getByRole('dialog', { name: 'Centro de Evidências' });
  await expect(evidence).toBeVisible();
  await expect(evidence.getByText(/cenário A, slot 3/i).first()).toBeVisible();
  await page.getByRole('button', { name: 'Fechar evidências' }).click();
  await page.getByRole('button', { name: 'Desfazer' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Última alteração desfeita.' })).toBeVisible();
  await expect(page.locator('.field-slot-updated')).toHaveCount(0);
  await expect(page.getByLabel('Três cenários do laboratório').getByRole('tabpanel')).toHaveCount(3);
});

test('blocks overlapping timeline dates and allows another crop entry', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm');
  await page.getByRole('button', { name: /2\. milho/ }).click();
  await page.getByText('Outra cultura', { exact: true }).click();
  await page.getByLabel('Outra cultura do evento 2').fill('mandioca');
  await page.getByLabel('Início (mês/ano) do evento 2').fill('2023-05');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByText('Este evento se sobrepõe ao anterior. Ajuste o início ou fim.')).toBeVisible();
  await expect(page.getByLabel('Início (mês/ano) do evento 2')).toHaveAttribute('aria-invalid', 'true');
});

test('explains invalid month fields and confirms a save without navigating away', async ({ page }) => {
  await installDraft(page);
  await page.goto('/farm');
  await page.getByRole('button', { name: /2\. milho/ }).click();
  const start = page.getByLabel('Início (mês/ano) do evento 2');
  await start.fill('');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(start).toHaveAttribute('aria-invalid', 'true');
  await expect(page.getByText('Informe mês e ano, por exemplo 2024-06.').first()).toBeVisible();
  await start.fill('2023-07');
  await page.getByRole('button', { name: 'Salvar rascunho' }).click();
  await expect(page.getByRole('status')).toContainText('Rascunho salvo neste dispositivo às');
  await expect(page).toHaveURL(/\/farm$/);
});

test('shows three stacked global scenarios and unknown climate after NASA failure', async ({ page }) => {
  await installDraft(page);
  await page.route('**/api/analyze', async (route) => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ input: draft().data, climate: { status: 'unavailable', origin: 'unavailable', monthly: [], plantingMonthPrecipitation: null, provenance: null, gaps: ['NASA indisponível para esta coordenada.'] }, regionalContext: { country: null, municipality: null, municipalitySource: null, zarc: null, gaps: ['Fora do Brasil.'] }, warnings: ['NASA indisponível para esta coordenada.'], regionalContextAvailable: false, disclaimer: 'Cenários exploratórios; não são recomendação agronômica, validação local, previsão ou prescrição.', priorityHighlights: ['historical_precipitation', 'cover_potential', 'functional_diversity'], strategies: ['A', 'B', 'C'].map((id) => ({ id, title: `Cenário ${id}`, baseline: id === 'A', baselineAssumed: id === 'A', horizonMonths: 24, proposedCrop: null, validationLevel: 'climate_exploration', regionalContextAvailable: false, indicators: [], explanations: [], missingData: ['historical_climate'], unavailable: true })) }) }));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/results');
  await expect(page.getByText('Indisponível: cenários preservados com métricas climáticas desconhecidas.')).toBeVisible();
  const headings = page.getByLabel('Estratégias exploratórias').getByRole('heading', { name: /Cenário [ABC]/ });
  await expect(headings).toHaveCount(3);
  const y = await headings.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().y));
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
