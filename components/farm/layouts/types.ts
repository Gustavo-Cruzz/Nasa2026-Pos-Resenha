import type { ReactNode } from 'react';
import type { AtlasPoint } from '@/lib/atlas';
import type { FarmRecord } from '@/lib/db/farms';
import type { Climate } from '@/components/atlas/location-explorer';

export type ClimateState = { kind: 'loading' } | { kind: 'ready'; data: Climate } | { kind: 'error'; message: string };

/**
 * What every "Minha fazenda" layout prototype receives. The dashboard fetches the data once and renders the layout
 * inside `ExploreExtrasProvider` (so `useExtras()` gives forecast, ENSO and regional context) and with the farm map
 * already built (`map`: the explore-style FarmMap with weather effects and perimeter editing).
 */
export type FarmLayoutProps = {
  farm: FarmRecord;
  username: string;
  ephemeral: boolean;
  point: AtlasPoint;
  climate: ClimateState;
  /** The explore-style map element; the layout decides only where and how big it is placed. */
  map: ReactNode;
  onOpenComparison: () => void;
  onSignOut: () => void;
};

/** Traffic light for a farmer-facing fact. `unknown` = no data (never estimated in its place). */
export type InsightTone = 'good' | 'attention' | 'info' | 'unknown';
export type InsightId = 'now' | 'rain7' | 'season' | 'dryspell' | 'enso' | 'rotation' | 'soil';

/** One short, farmer-facing fact derived ONLY from data the page already loads (never invented). */
export type FarmInsight = {
  id: InsightId;
  /** Short title, e.g. "Chuva nos próximos 7 dias". */
  title: string;
  /** Main value, already formatted, e.g. "42 mm", "out → mar", "24 °C"; null when unknown. */
  value: string | null;
  /** One short secondary line (period, source, coverage) or null. */
  detail: string | null;
  /** One plain-language sentence from João (what it means for the farmer; no prescriptions). */
  joao: string;
  tone: InsightTone;
  loading: boolean;
  /** Small series for a sparkline (e.g. 7 daily rain values, 12 monthly rain medians); null when not applicable. */
  series: Array<number | null> | null;
};

export type FarmInsights = Record<InsightId, FarmInsight> & {
  /** All insights in display order: now, rain7, season, dryspell, enso, rotation, soil. */
  list: FarmInsight[];
  /** Crop history for a compact timeline (oldest → newest). */
  timeline: Array<{ cropId: string | null; name: string; period: string; family: string | null; current: boolean }>;
  /** One-sentence summary from João for the top of the page. */
  headline: string;
};
