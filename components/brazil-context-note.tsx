export function BrazilContextNote({ compact = false }: { compact?: boolean }) {
  return <aside className={`rounded-lg border border-cyan-300/50 bg-cyan-500/10 text-cyan-100 ${compact ? 'p-3 text-xs' : 'p-4 text-sm'}`} aria-label="Escopo das fontes brasileiras"><b>Contexto Brasil</b><p className="mt-1">O catálogo reúne fontes brasileiras. Somente a coordenada demonstrativa de Rio Verde recebe contexto regional ZARC; isso não é validação nacional nem local.</p></aside>;
}
