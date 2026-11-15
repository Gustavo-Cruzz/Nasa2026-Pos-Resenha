'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import type { AtlasPoint, ClimateApiResponse } from '@/lib/atlas';
import { explainPlace, type JoaoLine } from '@/lib/explain/joao';
import { JoaoNote } from '@/components/joao/joao-note';
import { useExtras } from '@/components/atlas/explore-extras';
import { buildJoaoData } from '@/components/atlas/joao-data';
import { useLocale } from '@/components/locale-provider';

type Climate = Extract<ClimateApiResponse, { status: 'ok' }>;

const Lines = createContext<Record<string, JoaoLine>>({});

/**
 * Computes João's lines for the selected place (from the climate the panel loaded and the shared extra readings)
 * and makes each one available by id, so every block of data can carry its own comment.
 */
export function JoaoLinesProvider({ point, climate, children }: { point: AtlasPoint; climate: Climate; children: ReactNode }) {
  const { locale } = useLocale();
  const en = locale === 'en';
  const { forecast, enso, regional } = useExtras();
  const lines = useMemo(() => {
    const explanation = explainPlace(buildJoaoData({ placeName: point.label ?? null, month: new Date().getMonth() + 1, climate, forecast, enso, regional }), en ? 'en' : 'pt-BR');
    return Object.fromEntries(explanation.sections.flatMap((section) => section.lines).map((line) => [line.id, line]));
  }, [point.label, climate, forecast, enso, regional, en]);
  return <Lines.Provider value={lines}>{children}</Lines.Provider>;
}

/** João's comment for one block of data; renders nothing while that line has nothing to say (for example while it loads). */
export function JoaoComment({ id }: { id: string }) {
  const line = useContext(Lines)[id];
  return line ? <JoaoNote happening={line.text} mood={line.mood} tone={line.tone} why={line.hint} /> : null;
}
