import type { HeroState } from '@/lib/engine/decision-hero';

/** Inline pixel-art farmer whose expression mirrors the evidence state. Decorative: it never carries data on its own. */
const palette: Record<string, string> = { H: '#d9a441', S: '#f1c9a0', E: '#1b2a1e', M: '#8a4b3a', B: '#4f8a3c', A: '#f5c542', Q: '#7fd1e8' };
const base = ['....HHHH....', '..HHHHHHHH..', 'HHHHHHHHHHHH', '...SSSSSS...', '...SESSES...', '...SSSSSS...', '...SSSSSS...', '....SSSS....', '..BBBBBBBB..', '.BBBBBBBBBB.', '.BB.BBBB.BB.', '....BBBB....'];

function frame(state: HeroState): string[] {
  const rows = base.map((row) => row.split(''));
  const put = (r: number, c: number, ch: string) => { rows[r][c] = ch; };
  if (state === 'compatible') { put(6, 4, 'M'); put(6, 7, 'M'); put(7, 5, 'M'); put(7, 6, 'M'); }
  if (state === 'attention') { put(6, 5, 'M'); put(6, 6, 'M'); put(3, 4, 'E'); put(3, 7, 'E'); for (const r of [3, 4, 5]) put(r, 10, 'A'); put(7, 10, 'A'); }
  if (state === 'unknown') { put(4, 4, 'S'); put(4, 7, 'S'); put(5, 4, 'E'); put(5, 7, 'E'); put(6, 5, 'M'); put(6, 6, 'M'); for (const c of [9, 10, 11]) put(2, c, 'Q'); put(3, 11, 'Q'); put(4, 10, 'Q'); put(6, 10, 'Q'); }
  return rows.map((row) => row.join(''));
}

const label = { 'pt-BR': { compatible: 'Personagem fictícia tranquila', attention: 'Personagem fictícia em atenção', unknown: 'Personagem fictícia sem leitura' }, en: { compatible: 'Fictional character, calm', attention: 'Fictional character, alert', unknown: 'Fictional character, no reading' } } as const;

export function StatusCharacter({ state, locale, size = 72 }: { state: HeroState; locale: 'pt-BR' | 'en'; size?: number }) {
  return <svg aria-label={label[locale][state]} className={`status-character ${state === 'attention' ? 'status-character-alert' : ''}`} height={size} role="img" shapeRendering="crispEdges" viewBox="0 0 12 12" width={size}>{frame(state).flatMap((row, y) => row.split('').map((ch, x) => ch === '.' ? null : <rect fill={palette[ch]} height="1" key={`${x}-${y}`} width="1" x={x} y={y} />))}</svg>;
}
