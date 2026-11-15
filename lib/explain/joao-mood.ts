import type { JoaoTone } from '@/lib/explain/joao';

/**
 * João's moods. The mood follows the data, never the crop: it reacts to what a number says about its own normal,
 * and it never means a field is "healthy" or "doing well". Some moods still have no art: they are marked `missing`,
 * the page falls back to the neutral João, and a "Falta arte" tag shows while developing.
 */
export type JoaoMood = 'neutral' | 'happy' | 'alert' | 'sad' | 'unsure' | 'thinking';

export type MoodSpec = {
  /** Image under /public, or null while the art does not exist yet. */
  src: string | null;
  status: 'ready' | 'missing';
  label: string;
  /** When this mood is used, in plain words (also shown on the review page). */
  when: string;
  /** Where it shows up today in the app. */
  usedIn: string;
};

export const JOAO_MOODS: Record<JoaoMood, MoodSpec> = {
  neutral: { src: '/assets/brand/joao/neutral.webp', status: 'ready', label: 'Explicando', when: 'Dado informativo, sem sinal especial: o João só conta o que está acontecendo.', usedIn: 'Quase todos os comentários' },
  happy: { src: '/assets/brand/joao/happy.webp', status: 'ready', label: 'Animado', when: 'Sinal favorável nos números: mais água no solo do que o normal, poucas pausas de chuva, ou chuva acima do normal na época das chuvas.', usedIn: 'Explorar (solo, veranicos, previsão) e blocos “ok” do /results2 e /results3' },
  alert: { src: '/assets/brand/joao/alert.webp', status: 'ready', label: 'Atento', when: 'O dado pede atenção: solo mais seco que o normal, pausas de chuva comuns, chuva abaixo do normal na época das chuvas, ou o produtor relatou algo no solo.', usedIn: 'Explorar (solo, veranicos, previsão) e blocos “atenção” do /results2 e /results3' },
  sad: { src: '/assets/brand/joao/sad.webp', status: 'ready', label: 'Triste', when: 'Falta o dado: o João tentou buscar e não conseguiu, ou não tem aquela informação para o lugar.', usedIn: 'Qualquer linha “Sem dado” no Explorar' },
  unsure: { src: null, status: 'missing', label: 'Em dúvida', when: 'O João diz “não sei dizer”: por exemplo, o efeito local do El Niño na chuva, que ele não sabe afirmar.', usedIn: 'Explorar, cartão do El Niño' },
  thinking: { src: null, status: 'missing', label: 'Pensando', when: 'Enquanto os dados carregam.', usedIn: 'Ainda não usado: hoje o João fica quieto durante o carregamento' },
};

export const MOODS_MISSING = (Object.entries(JOAO_MOODS) as Array<[JoaoMood, MoodSpec]>).filter(([, spec]) => spec.status === 'missing').map(([mood]) => mood);

/** The mood a line gets from its tone, unless the line asks for a specific one. */
export function moodForTone(tone: JoaoTone): JoaoMood {
  return { good: 'happy', info: 'neutral', attention: 'alert', unknown: 'sad' }[tone] as JoaoMood;
}
