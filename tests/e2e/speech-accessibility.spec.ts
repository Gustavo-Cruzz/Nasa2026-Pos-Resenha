import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    type ResultHandler = ((event: { results: { 0: { 0: { transcript: string } } } }) => void) | null;
    class MockRecognition {
      lang = ''; continuous = false; interimResults = false; maxAlternatives = 1; onresult: ResultHandler = null; onerror = null; onend: (() => void) | null = null;
      start() { (window as unknown as { __recognitionLang: string }).__recognitionLang = this.lang; queueMicrotask(() => { this.onresult?.({ results: { 0: { 0: { transcript: 'Rio Verde' } } } }); this.onend?.(); }); }
      stop() { this.onend?.(); } abort() { this.onend?.(); }
    }
    class MockUtterance { lang = ''; rate = 1; voice = null; onend: (() => void) | null = null; onerror = null; constructor(public text: string) {} }
    const synth = { cancel() {}, pause() {}, resume() {}, getVoices: () => [{ lang: 'pt-BR' }, { lang: 'en-US' }], speak(utterance: MockUtterance) { const state = window as unknown as { __spoken: Array<{ text: string; lang: string }> }; state.__spoken ??= []; state.__spoken.push({ text: utterance.text, lang: utterance.lang }); } };
    Object.defineProperty(window, 'SpeechRecognition', { configurable: true, value: MockRecognition });
    Object.defineProperty(window, 'SpeechSynthesisUtterance', { configurable: true, value: MockUtterance });
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: synth });
  });
});

test('dictates into João chat in Portuguese and English without auto-sending', async ({ page }) => {
  await page.goto('/chat');
  await page.getByRole('button', { name: 'Mandar mensagem de áudio' }).click();
  await expect(page.getByText('Toque no microfone e fale.')).toBeVisible();
  await page.getByRole('button', { name: 'Falar sua resposta' }).click();
  await expect(page.getByLabel('Sua mensagem')).toHaveValue('Rio Verde');
  expect(await page.evaluate(() => (window as unknown as { __recognitionLang: string }).__recognitionLang)).toBe('pt-BR');
  await expect(page.getByRole('log')).not.toContainText('Rio Verde');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByLabel('Your message').fill('');
  await page.getByRole('button', { name: 'Speak your answer' }).click();
  await expect(page.getByLabel('Your message')).toHaveValue('Rio Verde');
  expect(await page.evaluate(() => (window as unknown as { __recognitionLang: string }).__recognitionLang)).toBe('en-US');
});

test('reads the main page with bilingual controls and highlights current content', async ({ page }) => {
  await page.goto('/methodology');
  await page.getByRole('button', { name: 'Ler página' }).click();
  await expect(page.getByRole('button', { name: 'Pausar leitura' })).toBeVisible();
  await expect(page.locator('#main-content')).toHaveAttribute('data-reading', 'true');
  expect(await page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string; lang: string }> }).__spoken.at(-1)?.lang)).toBe('pt-BR');
  await page.getByRole('button', { name: 'Parar leitura' }).click();
  await expect(page.locator('#main-content')).not.toHaveAttribute('data-reading', 'true');
  await page.getByRole('button', { name: 'English' }).click();
  await page.getByRole('button', { name: 'Read page' }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { __spoken: Array<{ text: string; lang: string }> }).__spoken.at(-1)?.lang)).toBe('en-US');
});
