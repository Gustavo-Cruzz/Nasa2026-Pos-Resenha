import type { LabChangeDelta } from '@/lib/lab/diff';
import { EvidenceIcon } from '@/components/pixel/evidence-icon';
import { useLocale } from '@/components/locale-provider';

const stateLabel: Record<string, string> = { compatible: 'compatível', attention: 'atenção', unknown: 'desconhecido', yes: 'presente', no: 'não catalogado', observed: 'observado' };
const missingLabel: Record<string, string> = { crop: 'cultura do slot', temperature: 'faixa térmica', cycle: 'duração documentada', soil_ph: 'contexto de pH', previous_crop_family: 'família da cultura anterior' };

export function LabChangeFeedback({ delta, cropName, onEvidence, onUndo }: { delta: LabChangeDelta; cropName: string; onEvidence: () => void; onUndo: () => void }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const states = en ? { compatible: 'compatible', attention: 'attention', unknown: 'unknown', yes: 'present', no: 'not cataloged', observed: 'observed' } : stateLabel;
  const missing = en ? { crop: 'slot crop', temperature: 'thermal range', cycle: 'documented duration', soil_ph: 'pH context', previous_crop_family: 'previous crop family' } : missingLabel;
  const changed = delta.changes.filter((change) => change.direction !== 'unchanged').slice(0, 3);
  return <aside className="mt-3 rounded-lg border border-cyan-300/50 bg-cyan-500/10 p-3 text-sm text-cyan-50" aria-label={en ? 'Slot change effect' : 'Efeito da alteração do slot'} aria-live="polite" role="status">
    <p className="font-bold">{en ? `${cropName} applied` : `${cropName} aplicado`}</p>
    {changed.length ? <><p className="mt-2 text-xs font-semibold uppercase text-cyan-200">{en ? 'Changed' : 'Mudou'}</p><ul className="mt-1 space-y-1">{changed.map((change) => <li key={change.indicator}>✓ {change.label}: {states[change.before as keyof typeof states]} → {states[change.after as keyof typeof states]}</li>)}</ul></> : <p className="mt-2">{en ? 'Crop changed; available indicators remained the same.' : 'Cultura alterada; os indicadores disponíveis permaneceram iguais.'}</p>}
    {delta.evidenceStillMissing.length ? <><p className="mt-2 text-xs font-semibold uppercase text-amber-200">{en ? 'Still unknown' : 'Permanece desconhecido'}</p><p className="mt-1 text-amber-50">? {delta.evidenceStillMissing.slice(0, 3).map((item) => missing[item as keyof typeof missing] ?? item).join(' · ')}</p></> : null}
    <div className="mt-3 flex flex-wrap gap-3"><button className="inline-flex min-h-10 items-center gap-2 font-semibold underline" type="button" onClick={onEvidence}><EvidenceIcon kind="source" size={16} />{en ? 'View evidence' : 'Ver evidências'}</button><button className="min-h-10 font-semibold underline" type="button" onClick={onUndo}>{en ? 'Undo' : 'Desfazer'}</button></div>
  </aside>;
}
