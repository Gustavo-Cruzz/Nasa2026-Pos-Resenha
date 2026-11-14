import type { AnalysisInput } from '@/lib/schema';

export type DemoPlaceId = 'brazil' | 'ghana' | 'india';
type Demo = { id: DemoPlaceId; label: { 'pt-BR': string; en: string }; input: AnalysisInput };

/** A ~300 m square around the point. A demonstration outline, not anyone's field. */
const square = (latitude: number, longitude: number): NonNullable<AnalysisInput['fieldBoundary']> => { const d = 0.0015; return [[longitude - d, latitude - d], [longitude + d, latitude - d], [longitude + d, latitude + d], [longitude - d, latitude + d]]; };
const base = { priorities: { water: 3, soil: 2, operations: 1 }, irrigation: 'unknown' as const };

export const demoScenarios: Demo[] = [
  { id: 'brazil', label: { 'pt-BR': 'Brasil · Rio Verde (GO)', en: 'Brazil · Rio Verde (GO)' }, input: { ...base, location: { latitude: -17.798, longitude: -50.919 }, fieldBoundary: square(-17.798, -50.919), plantingMonth: 4, history: [{ cropId: 'soybean', startYearMonth: '2023-01', endYearMonth: '2023-06' }, { cropId: 'maize', startYearMonth: '2023-07', endYearMonth: '2023-12' }, { cropId: 'soybean', startYearMonth: '2024-01', endYearMonth: '2024-06' }], futureBaseline: { cropId: 'soybean', confirmed: true } } },
  { id: 'ghana', label: { 'pt-BR': 'Gana · Acra', en: 'Ghana · Accra' }, input: { ...base, location: { latitude: 5.6037, longitude: -0.187 }, fieldBoundary: square(5.6037, -0.187), plantingMonth: 5, history: [{ cropId: 'maize', startYearMonth: '2023-03', endYearMonth: '2023-08' }, { cropId: 'cowpea', startYearMonth: '2023-09', endYearMonth: '2023-12' }] } },
  { id: 'india', label: { 'pt-BR': 'Índia · Nova Délhi', en: 'India · New Delhi' }, input: { ...base, location: { latitude: 28.6139, longitude: 77.209 }, fieldBoundary: square(28.6139, 77.209), plantingMonth: 7, history: [{ cropId: 'sorghum', startYearMonth: '2023-06', endYearMonth: '2023-10' }, { cropId: 'maize', startYearMonth: '2024-06', endYearMonth: '2024-10' }] } },
];
