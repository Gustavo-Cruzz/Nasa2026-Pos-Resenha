import { z } from 'zod';

export const PREFERENCES_KEY = 'field-shift:prefs';
export const preferencesSchema = z.object({ textSize: z.enum(['normal', 'large']), contrast: z.enum(['normal', 'high']), motion: z.enum(['normal', 'reduced']) });
export type Preferences = z.infer<typeof preferencesSchema>;
export const defaultPreferences: Preferences = { textSize: 'normal', contrast: 'normal', motion: 'normal' };

export function loadPreferences(): Preferences {
  try { const parsed = preferencesSchema.safeParse(JSON.parse(window.localStorage.getItem(PREFERENCES_KEY) ?? 'null')); return parsed.success ? parsed.data : defaultPreferences; } catch { return defaultPreferences; }
}

/** Mirrors the preferences onto <html> data attributes, which the CSS and PixelAnimation read. */
export function applyPreferences(preferences: Preferences): void {
  const root = document.documentElement;
  const set = (name: string, on: boolean, value: string) => { if (on) root.dataset[name] = value; else delete root.dataset[name]; };
  set('text', preferences.textSize === 'large', 'large');
  set('contrast', preferences.contrast === 'high', 'high');
  set('motion', preferences.motion === 'reduced', 'reduced');
  window.dispatchEvent(new Event('field-shift:prefs'));
}

export function savePreferences(preferences: Preferences): void {
  try { window.localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences)); } catch { /* storage blocked: preference applies for this visit only */ }
  applyPreferences(preferences);
}

/** Runs before hydration (inline in <head>) so the saved choices apply without a flash. */
export const preferencesBootScript = `try{var p=JSON.parse(localStorage.getItem('${PREFERENCES_KEY}')||'{}');var d=document.documentElement;if(p.textSize==='large')d.dataset.text='large';if(p.contrast==='high')d.dataset.contrast='high';if(p.motion==='reduced')d.dataset.motion='reduced';}catch(e){}`;
