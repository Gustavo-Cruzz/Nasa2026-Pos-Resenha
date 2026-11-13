import Image from 'next/image';

export type EvidenceKind = 'nasa' | 'farmer' | 'regional' | 'unknown' | 'source' | 'review';

const labels: Record<EvidenceKind, string> = {
  nasa: 'Dado climático NASA', farmer: 'Informação declarada pelo produtor', regional: 'Contexto regional',
  unknown: 'Evidência desconhecida', source: 'Fonte documentada', review: 'Revisão técnica',
};

export function EvidenceIcon({ kind, size = 24 }: { kind: EvidenceKind; size?: 16 | 24 | 32 }) {
  const file = `/assets/evidence/evidence-${kind}${size === 16 ? '-16' : ''}.png`;
  return <Image alt={labels[kind]} className="inline-block shrink-0 [image-rendering:pixelated]" height={size} src={file} width={size} />;
}
