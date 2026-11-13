import type { BrazilRegionalContext } from '@/lib/brazil/types';

export function BrazilContextNote({ compact = false, context }: { compact?: boolean; context?: BrazilRegionalContext | null }) {
  const message = context?.municipality
    ? context.zarc
      ? `${context.municipality.name} (${context.municipality.uf}), código IBGE ${context.municipality.code}. Há registros ZARC ${context.zarc.safra} para ${Object.keys(context.zarc.crops).length} culturas P0; isso é contexto municipal, não validação do talhão.`
      : `${context.municipality.name} (${context.municipality.uf}) foi identificado pela malha IBGE, mas não há registro P0 no pacote ZARC carregado.`
    : context?.country === null
      ? 'A coordenada não foi associada a município brasileiro. A análise climática global continua disponível.'
      : 'No Brasil, coordenadas são associadas à malha municipal do IBGE e cruzadas com o ZARC vigente. Fonte regional não é validação local.';
  const pam = context?.pam;
  return <aside className={`rounded-lg border border-cyan-300/50 bg-cyan-500/10 text-cyan-100 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'}`} aria-label="Escopo das fontes brasileiras"><b>Contexto Brasil</b><p className="mt-1">{message}</p>{pam ? <details className="mt-2"><summary className="cursor-pointer font-semibold">Produção municipal observada — PAM {pam.year}</summary><ul className="mt-2 list-disc space-y-1 pl-5">{pam.products.map((product) => <li key={product.productCode}>{product.productLabel}: {product.harvestedAreaHa?.toLocaleString('pt-BR') ?? 'N/D'} ha colhidos{product.caveat ? ` — ${product.caveat}` : ''}</li>)}</ul><p className="mt-2">{pam.caveat}</p><a className="mt-2 inline-block underline" href={pam.sourceUrl} rel="noreferrer" target="_blank">Fonte IBGE/SIDRA</a></details> : <p className="mt-2">PAM: nenhuma observação positiva coberta para o município/ano.</p>}</aside>;
}
