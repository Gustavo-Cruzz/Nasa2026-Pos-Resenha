import type { AnalysisResult } from '@/lib/engine/types';
import type { Locale } from '@/lib/i18n';
import { deriveDecisionHero } from '@/lib/engine/decision-hero';
import { buildSourceHealth } from '@/lib/source-health';
import type { BlockComment } from '@/components/results3/joao-guide';
import { MONTH_NAMES } from '@/components/results/visuals';
import { cropDisplayName } from '@/lib/presentation';

export const blockIds = ['glance', 'scenarios', 'climate', 'water', 'calendar', 'soil', 'terrain', 'rotation', 'quality', 'next'] as const;
export type BlockId = (typeof blockIds)[number];
/** Blocks that João's Gemini explanation covers, and the section whose comment they reuse. */
export const sectionForBlock: Partial<Record<BlockId, 'overview' | 'climate' | 'water' | 'soil' | 'rotation' | 'terrain'>> = { scenarios: 'overview', climate: 'climate', water: 'water', soil: 'soil', rotation: 'rotation', terrain: 'terrain' };

/** Comments for the blocks without a Gemini section: built only from fields already in the analysis, never from new facts. */
export function localBlockComments(data: AnalysisResult, locale: Locale): Record<'glance' | 'calendar' | 'quality' | 'next', BlockComment> {
  const en = locale === 'en';
  const names = MONTH_NAMES[locale];
  const hero = deriveDecisionHero(data);
  const month = names[hero.month - 1];
  const health = buildSourceHealth(data);
  const ok = health.filter((item) => item.state === 'available' || item.state === 'cache_verified').length;
  const rainy = data.climate.seasonality?.rainySeason;
  const cropNames = hero.items.map((item) => `${cropDisplayName(item.cropId, item.cropName, locale)} (${item.scenarioId})`).join(', ');
  const assumed = data.strategies.some((strategy) => strategy.baselineAssumed);
  const heroLine = hero.state === 'attention'
    ? en ? `In ${month}, the NASA temperature falls outside the documented range for ${cropNames}.` : `Em ${month}, a temperatura NASA fica fora da faixa documentada de ${cropNames}.`
    : hero.state === 'compatible'
      ? en ? `In ${month}, the NASA temperature is inside the documented range of every scenario crop.` : `Em ${month}, a temperatura NASA está dentro da faixa documentada de todas as culturas dos cenários.`
      : en ? `In ${month}, there is no reading that can be compared with a documented range.` : `Em ${month}, não há leitura que possa ser comparada com uma faixa documentada.`;
  return {
    glance: en
      ? { happening: `This first block puts the main reading in one place: the NASA temperature for the planting month against each crop's documented range. ${heroLine}`, points: hero.observedValue !== null ? [`NASA median for ${month}: ${hero.observedValue} ${hero.unit ?? ''}.`.trim()] : [], limit: 'A documented range is a reference for comparison, not advice for your field.' }
      : { happening: `Este primeiro bloco reúne a leitura principal: a temperatura NASA do mês de plantio diante da faixa documentada de cada cultura. ${heroLine}`, points: hero.observedValue !== null ? [`Mediana NASA em ${month}: ${hero.observedValue} ${hero.unit ?? ''}.`.trim()] : [], limit: 'Faixa documentada é referência para comparar, não conselho para o seu talhão.' },
    calendar: en
      ? { happening: rainy ? `Cyan months are the rainy season found in the history: ${names[rainy.startMonth - 1]} to ${names[rainy.endMonth - 1]}, ${rainy.lengthMonths} months.` : 'No continuous rainy season could be identified from the history, so the strip stays unknown.', points: [`Planting month in the analysis: ${names[data.input.plantingMonth - 1]}.`], limit: 'A climate window is not a planting date and does not predict this year.' }
      : { happening: rainy ? `Os meses em ciano são a estação chuvosa encontrada no histórico: de ${names[rainy.startMonth - 1]} a ${names[rainy.endMonth - 1]}, ${rainy.lengthMonths} meses.` : 'Não foi possível identificar uma estação chuvosa contínua no histórico, então a faixa fica como desconhecida.', points: [`Mês de plantio na análise: ${names[data.input.plantingMonth - 1]}.`], limit: 'Janela climática não é data de plantio e não prevê este ano.' },
    quality: en
      ? { happening: `Here you can see where each piece of data came from and how complete it is. ${ok} of ${health.length} sources are available.`, points: [], limit: 'A missing source stays N/D; nothing was filled in to look complete.' }
      : { happening: `Aqui você vê de onde veio cada dado e quão completo ele está. ${ok} de ${health.length} fontes estão disponíveis.`, points: [], limit: 'Fonte ausente continua N/D; nada foi preenchido para parecer completo.' },
    next: en
      ? { happening: 'This page compares hypotheses; it does not decide for you. The next step is to take the scenarios and sources to someone who knows your field.', points: assumed ? ['The baseline was assumed: confirm it first.'] : [], limit: 'Human review is not an automatic validation, and this is not a recommendation.' }
      : { happening: 'Esta página compara hipóteses; ela não decide por você. O próximo passo é levar os cenários e as fontes a quem conhece o seu talhão.', points: assumed ? ['A linha de base foi presumida: confirme-a primeiro.'] : [], limit: 'Revisão humana não é validação automática, e isto não é recomendação.' },
  };
}
