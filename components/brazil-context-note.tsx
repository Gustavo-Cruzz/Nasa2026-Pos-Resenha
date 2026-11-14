import type { BrazilRegionalContext } from '@/lib/brazil/types';
import { EvidenceIcon } from '@/components/pixel/evidence-icon';
import { pamNoteState } from '@/lib/brazil/pam-note';
import { useLocale } from '@/components/locale-provider';

export function BrazilContextNote({ compact = false, context }: { compact?: boolean; context?: BrazilRegionalContext | null }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const message = context?.municipality
    ? context.zarc
      ? en ? `${context.municipality.name} (${context.municipality.uf}), IBGE code ${context.municipality.code}. ZARC ${context.zarc.safra} records are available for ${Object.keys(context.zarc.crops).length} P0 crops.` : `${context.municipality.name} (${context.municipality.uf}), código IBGE ${context.municipality.code}. Registros ZARC ${context.zarc.safra} disponíveis para ${Object.keys(context.zarc.crops).length} culturas P0.`
      : en ? `${context.municipality.name} (${context.municipality.uf}) was identified in the IBGE mesh, but the loaded ZARC package has no P0 record.` : `${context.municipality.name} (${context.municipality.uf}) foi identificado pela malha IBGE, mas não há registro P0 no pacote ZARC carregado.`
    : context?.country === null
      ? en ? 'This coordinate was not associated with a Brazilian municipality. Global climate analysis remains available.' : 'A coordenada não foi associada a município brasileiro. A análise climática global continua disponível.'
      : en ? 'In Brazil, coordinates are associated with the IBGE municipal mesh and cross-referenced with the current ZARC package.' : 'No Brasil, coordenadas são associadas à malha municipal do IBGE e cruzadas com o ZARC vigente.';
  const pam = context?.pam;
  return <aside className={`rounded-lg border border-cyan-300/50 bg-cyan-500/10 text-cyan-100 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'}`} aria-label={en ? 'Brazilian source scope' : 'Escopo das fontes brasileiras'}><b className="inline-flex items-center gap-2"><EvidenceIcon kind="regional" size={16} />{en ? 'Brazil context' : 'Contexto Brasil'}</b><p className="mt-1">{message}</p>{pam ? <details className="mt-2"><summary className="cursor-pointer font-semibold">{en ? 'Observed municipal production' : 'Produção municipal observada'} — PAM {pam.year}</summary><ul className="mt-2 list-disc space-y-1 pl-5">{pam.products.map((product) => <li key={product.productCode}>{product.productLabel}: {product.harvestedAreaHa?.toLocaleString(en ? 'en-US' : 'pt-BR') ?? 'N/D'} {en ? 'harvested ha' : 'ha colhidos'}{product.caveat ? ` — ${product.caveat}` : ''}</li>)}</ul><p className="mt-2">{pam.caveat}</p><a className="mt-2 inline-block underline" href={pam.sourceUrl} rel="noreferrer" target="_blank">{en ? 'IBGE/SIDRA source' : 'Fonte IBGE/SIDRA'}</a></details> : pamNoteState(context) === 'none' ? <p className="mt-2">{en ? 'PAM: no covered positive observation for this municipality/year.' : 'PAM: nenhuma observação positiva coberta para o município/ano.'}</p> : null}</aside>;
}
