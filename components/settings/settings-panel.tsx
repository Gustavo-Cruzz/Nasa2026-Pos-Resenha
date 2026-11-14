'use client';

import { useId, useState, useSyncExternalStore } from 'react';
import { Download, FileUp } from 'lucide-react';
import { defaultPreferences, loadPreferences, savePreferences, PREFERENCES_KEY, type Preferences } from '@/lib/preferences';
import { loadDraft, saveDraft } from '@/lib/storage';
import { draftImportMessage, parseDraftFile, serializeDraft } from '@/lib/draft-transfer';
import { clearLastAnalysis, loadLastAnalysis } from '@/lib/analysis-cache';
import { useLocale } from '@/components/locale-provider';

const SYNC_EVENT = 'field-shift:data';
const subscribe = (notify: () => void) => { window.addEventListener('storage', notify); window.addEventListener('field-shift:prefs', notify); window.addEventListener(SYNC_EVENT, notify); return () => { window.removeEventListener('storage', notify); window.removeEventListener('field-shift:prefs', notify); window.removeEventListener(SYNC_EVENT, notify); }; };
const read = (key: string) => () => { try { return window.localStorage.getItem(key) ?? ''; } catch { return ''; } };

type Choice<T extends string> = { value: T; label: string };
function Segmented<T extends string>({ legend, value, choices, onChange }: { legend: string; value: T; choices: Array<Choice<T>>; onChange: (value: T) => void }) {
  const name = useId();
  return <fieldset className="mt-4"><legend className="font-semibold">{legend}</legend><div className="mt-2 flex flex-wrap gap-2">{choices.map((choice) => <label className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-4 text-sm font-semibold focus-within:outline focus-within:outline-2 focus-within:outline-lime-300 ${choice.value === value ? 'border-lime-300 bg-lime-300/15' : 'border-slate-600'}`} key={choice.value}><input checked={choice.value === value} className="accent-lime-300" name={name} type="radio" value={choice.value} onChange={() => onChange(choice.value)} />{choice.label}</label>)}</div></fieldset>;
}

export function SettingsPanel() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const rawPrefs = useSyncExternalStore(subscribe, read(PREFERENCES_KEY), () => '');
  const rawDraft = useSyncExternalStore(subscribe, read('field-shift:draft'), () => '');
  const rawAnalysis = useSyncExternalStore(subscribe, read('field-shift:last-analysis'), () => '');
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string }>();
  const importId = useId();
  const prefs: Preferences = rawPrefs ? loadPreferences() : defaultPreferences;
  const set = (patch: Partial<Preferences>) => savePreferences({ ...prefs, ...patch });
  // Only touch storage when the (server-empty) snapshots say there is something, so server and first client render agree.
  const draft = rawDraft ? loadDraft() : undefined;
  const cached = rawAnalysis ? loadLastAnalysis() : undefined;
  const stamp = (iso: string) => new Date(iso).toLocaleString(en ? 'en-US' : 'pt-BR');

  const exportDraft = () => {
    const current = loadDraft();
    if (!current) { setMessage({ kind: 'error', text: en ? 'There is no draft on this device to export.' : 'Não há rascunho neste dispositivo para exportar.' }); return; }
    const url = URL.createObjectURL(new Blob([serializeDraft(current)], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'field-shift-draft.json'; link.click(); URL.revokeObjectURL(url);
    setMessage({ kind: 'ok', text: en ? 'Draft exported.' : 'Rascunho exportado.' });
  };
  const importDraft = async (file: File | undefined) => {
    if (!file) return;
    const result = parseDraftFile(await file.text());
    if (!result.ok) { setMessage({ kind: 'error', text: draftImportMessage(result.code, locale) }); return; }
    saveDraft(result.draft.data, result.draft.legacy, result.draft.labPlan);
    window.dispatchEvent(new Event(SYNC_EVENT));
    setMessage({ kind: 'ok', text: en ? 'Draft imported and saved on this device.' : 'Rascunho importado e salvo neste dispositivo.' });
  };
  const forgetAnalysis = () => { clearLastAnalysis(); window.dispatchEvent(new Event(SYNC_EVENT)); setMessage({ kind: 'ok', text: en ? 'Saved analysis removed.' : 'Análise salva removida.' }); };

  return <section className="mx-auto max-w-3xl">
    <h1 className="page-title font-bold">{en ? 'Settings and local data' : 'Ajustes e dados locais'}</h1>
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/75 p-5" aria-labelledby="prefs-heading"><h2 className="text-xl font-bold" id="prefs-heading">{en ? 'Reading preferences' : 'Preferências de leitura'}</h2>
      <Segmented legend={en ? 'Text size' : 'Tamanho do texto'} value={prefs.textSize} choices={[{ value: 'normal', label: en ? 'Normal' : 'Normal' }, { value: 'large', label: en ? 'Large' : 'Grande' }]} onChange={(textSize) => set({ textSize })} />
      <Segmented legend={en ? 'Contrast' : 'Contraste'} value={prefs.contrast} choices={[{ value: 'normal', label: 'Normal' }, { value: 'high', label: en ? 'High contrast' : 'Alto contraste' }]} onChange={(contrast) => set({ contrast })} />
      <Segmented legend={en ? 'Animations' : 'Animações'} value={prefs.motion} choices={[{ value: 'normal', label: en ? 'Normal' : 'Normais' }, { value: 'reduced', label: en ? 'Reduce animations' : 'Reduzir animações' }]} onChange={(motion) => set({ motion })} />
    </section>
    <section className="mt-6 rounded-xl border border-slate-700 bg-slate-900/75 p-5" aria-labelledby="data-heading"><h2 className="text-xl font-bold" id="data-heading">{en ? 'Local data and offline use' : 'Dados locais e uso offline'}</h2>
      <ul className="mt-3 space-y-1 text-sm text-slate-300"><li>{en ? 'Draft' : 'Rascunho'}: {draft ? `${en ? 'saved' : 'salvo'} ${stamp(draft.savedAt)}` : en ? 'none' : 'nenhum'}</li><li>{en ? 'Last analysis' : 'Última análise'}: {cached ? `${en ? 'saved' : 'salva'} ${stamp(cached.savedAt)}` : en ? 'none' : 'nenhuma'}</li></ul>
      <p className="mt-3 text-sm text-slate-300">{en ? 'Pages you have already opened work without network, using the saved draft and the last saved analysis. Without network, NASA data is not refreshed; the app says so when it shows saved data.' : 'As páginas que você já abriu funcionam sem rede, com o rascunho e a última análise salvos. Sem rede, os dados NASA não são atualizados; o app avisa quando mostra dados salvos.'}</p>
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300" type="button" onClick={exportDraft}><Download aria-hidden="true" size={16} />{en ? 'Export draft (JSON)' : 'Exportar rascunho (JSON)'}</button>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300 focus-within:outline focus-within:outline-2 focus-within:outline-lime-300" htmlFor={importId}><FileUp aria-hidden="true" size={16} />{en ? 'Import draft (JSON)' : 'Importar rascunho (JSON)'}<input accept=".json,application/json" className="sr-only" id={importId} type="file" onChange={(event) => { void importDraft(event.target.files?.[0]); event.target.value = ''; }} /></label>
        {cached ? <button className="min-h-11 px-2 text-sm font-semibold underline" type="button" onClick={forgetAnalysis}>{en ? 'Remove saved analysis' : 'Remover análise salva'}</button> : null}
      </div>
      {message ? <p className={`mt-3 text-sm ${message.kind === 'error' ? 'font-medium text-amber-100' : 'text-lime-200'}`} role={message.kind === 'error' ? 'alert' : 'status'}>{message.text}</p> : null}
    </section>
  </section>;
}
