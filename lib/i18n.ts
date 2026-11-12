export const dictionaries = {
  'pt-BR': {
    productName: 'Field Shift',
    tagline: 'Comparação de rotações com clima histórico e limites explícitos.',
    start: 'Começar exploração',
    methodology: 'Metodologia',
    explore: 'Explorar',
    farm: 'Minha fazenda',
    lab: 'Laboratório',
    compare: 'Comparar',
    results: 'Resultados',
    comingSoon: 'Fundação pronta. Este fluxo será habilitado nos próximos sprints.',
  },
  en: {
    productName: 'Field Shift',
    tagline: 'Compare rotations with historical climate and explicit limits.',
    start: 'Start exploring',
    methodology: 'Methodology',
    explore: 'Explore',
    farm: 'My farm',
    lab: 'Laboratory',
    compare: 'Compare',
    results: 'Results',
    comingSoon: 'Foundation ready. This flow will be enabled in later sprints.',
  },
} as const;

export type Locale = keyof typeof dictionaries;
export const defaultLocale: Locale = 'pt-BR';
