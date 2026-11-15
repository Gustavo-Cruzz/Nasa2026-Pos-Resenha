'use client';

import Image from 'next/image';
import { useLocale } from '@/components/locale-provider';

export type EvidenceKind = 'nasa' | 'farmer' | 'regional' | 'unknown' | 'source' | 'review';

const labels = {
  'pt-BR': {
    nasa: 'Dado climático NASA', farmer: 'Informação declarada pelo produtor', regional: 'Contexto regional',
    unknown: 'Evidência desconhecida', source: 'Fonte documentada', review: 'Revisão técnica',
  },
  en: {
    nasa: 'NASA climate data', farmer: 'Information declared by the farmer', regional: 'Regional context',
    unknown: 'Unknown evidence', source: 'Documented source', review: 'Technical review',
  },
} as const;

export function EvidenceIcon({ kind, size = 24 }: { kind: EvidenceKind; size?: 16 | 24 | 32 }) {
  const { locale } = useLocale();
  const file = `/assets/evidence/evidence-${kind}${size === 16 ? '-16' : ''}.png`;
  return <Image alt={labels[locale][kind]} className="inline-block shrink-0 [image-rendering:pixelated]" height={size} src={file} width={size} />;
}
