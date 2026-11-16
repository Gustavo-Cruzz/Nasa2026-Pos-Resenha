'use client';

import type { CSSProperties } from 'react';
import { pick, type Bi, type Level } from '@/components/methodology/content';
import styles from '@/components/methodology/methodology.module.css';

type Node = { title: Bi; simple: Bi; technical: Bi };

const SOURCES: Node[] = [
  { title: { pt: 'NASA POWER + IMERG', en: 'NASA POWER + IMERG' }, simple: { pt: 'Clima diário 2011–2025', en: 'Daily climate 2011–2025' }, technical: { pt: 'T2M·PRECTOTCORR·RH2M·WS2M', en: 'T2M·PRECTOTCORR·RH2M·WS2M' } },
  { title: { pt: 'NASA SRTM', en: 'NASA SRTM' }, simple: { pt: 'Altitude do terreno', en: 'Terrain elevation' }, technical: { pt: 'GL1 v003 · 1″ (~30 m)', en: 'GL1 v003 · 1″ (~30 m)' } },
  { title: { pt: 'Embrapa · FAO', en: 'Embrapa · FAO' }, simple: { pt: 'Faixas de cada cultura', en: 'Each crop’s ranges' }, technical: { pt: 'viableTempC · ciclo · Kc · pH', en: 'viableTempC · cycle · Kc · pH' } },
  { title: { pt: 'Usuário', en: 'User' }, simple: { pt: 'Histórico e prioridades', en: 'History and priorities' }, technical: { pt: 'Zod · análise de solo opcional', en: 'Zod · optional soil analysis' } },
  { title: { pt: 'Dados oficiais do Brasil', en: 'Brazil official data' }, simple: { pt: 'IBGE · ZARC · PAM · SoilGrids', en: 'IBGE · ZARC · PAM · SoilGrids' }, technical: { pt: 'decêndio · SIDRA 5457 · 5 km', en: '10-day · SIDRA 5457 · 5 km' } },
  { title: { pt: 'NASA MODIS NDVI', en: 'NASA MODIS NDVI' }, simple: { pt: 'Verde da vegetação', en: 'Vegetation greenness' }, technical: { pt: 'MOD13Q1 · 250 m · 5.571 municípios', en: 'MOD13Q1 · 250 m · 5,571 municipalities' } },
];

const STEPS: Node[] = [
  { title: { pt: 'ET0 FAO-56', en: 'FAO-56 ET0' }, simple: { pt: 'Quanta água o ar “pede”', en: 'How much water the air “asks”' }, technical: { pt: 'Penman-Monteith diário, G = 0', en: 'Daily Penman-Monteith, G = 0' } },
  { title: { pt: 'Balanço chuva − ET0', en: 'Rain − ET0 balance' }, simple: { pt: 'Sobra ou falta água no mês', en: 'Water surplus or deficit per month' }, technical: { pt: 'mediana anual de Σ(P − ET0)', en: 'median of yearly Σ(P − ET0)' } },
  { title: { pt: 'Erosividade', en: 'Erosivity' }, simple: { pt: 'Força da chuva sobre o solo', en: 'Rain’s force on the soil' }, technical: { pt: 'Fournier: MFI = Σ p² / P', en: 'Fournier: MFI = Σ p² / P' } },
  { title: { pt: 'Declividade', en: 'Slope' }, simple: { pt: 'Classes de relevo da Embrapa', en: 'Embrapa relief classes' }, technical: { pt: '100·√(dz/dx² + dz/dy²)', en: '100·√(dz/dx² + dz/dy²)' } },
  { title: { pt: 'Regra da cultura', en: 'Crop rule' }, simple: { pt: 'Temperatura do mês × faixa', en: 'Month temperature × range' }, technical: { pt: 'margem = mín(T − mín, máx − T)', en: 'margin = min(T − min, max − T)' } },
  { title: { pt: 'Contexto e evidência', en: 'Context and evidence' }, simple: { pt: 'ZARC, produção, solo, NDVI', en: 'ZARC, production, soil, NDVI' }, technical: { pt: 'ZARC ⇒ contexto regional', en: 'ZARC ⇒ regional context' } },
];

/** [source index, step index]: which input feeds which calculation, as wired in lib/engine and lib/climate. */
const EDGES: Array<[number, number]> = [[0, 0], [0, 1], [0, 2], [0, 4], [1, 3], [2, 4], [3, 4], [3, 5], [4, 5], [5, 5]];
const CY = (index: number) => 45 + index * 70;
const curve = (x1: number, y1: number, x2: number, y2: number) => { const mid = (x1 + x2) / 2; return `M${x1} ${y1} C${mid} ${y1}, ${mid} ${y2}, ${x2} ${y2}`; };

export function PipelineDiagram({ level, en }: { level: Level; en: boolean }) {
  const sub = (node: Node) => pick(level === 'technical' ? node.technical : node.simple, en);
  const chips: Array<{ label: string; fill: string; text: string }> = [
    { label: en ? 'Compatible' : 'Compatível', fill: 'rgb(190 242 100)', text: '#0f172a' },
    { label: en ? 'Attention' : 'Atenção', fill: 'rgb(252 211 77)', text: '#0f172a' },
    { label: 'N/D', fill: 'rgb(71 85 105)', text: '#f1f5f9' },
  ];
  const columns = [
    { title: en ? '1 · Data in' : '1 · Dados de entrada', items: SOURCES },
    { title: en ? '2 · Documented calculations' : '2 · Cálculos documentados', items: STEPS },
  ];
  return <div>
    <figure className="mt-5 hidden overflow-hidden rounded-2xl border border-slate-700 bg-slate-950/60 p-3 md:block">
      <svg aria-labelledby="pipeline-title pipeline-desc" className="h-auto w-full" role="img" viewBox="0 0 1000 440">
        <title id="pipeline-title">{en ? 'From satellite to result' : 'Do satélite ao resultado'}</title>
        <desc id="pipeline-desc">{en ? 'Six inputs feed six documented calculations, which produce scenarios A, B and C month by month as Compatible, Attention or N/D. The same content is listed in text below.' : 'Seis entradas alimentam seis cálculos documentados, que geram os cenários A, B e C mês a mês como Compatível, Atenção ou N/D. O mesmo conteúdo está em texto logo abaixo.'}</desc>
        {EDGES.map(([from, to]) => <g key={`${from}-${to}`}><path className={styles.track} d={curve(230, CY(from), 390, CY(to))} /><path className={`${styles.flow} ${styles.flowCyan}`} d={curve(230, CY(from), 390, CY(to))} /></g>)}
        <path className={styles.track} d={`M505 70 L505 90`} /><path className={`${styles.flow} ${styles.flowCyan} ${styles.flowSlow}`} d="M505 70 L505 90" />
        {STEPS.map((_, index) => <g key={index}><path className={styles.track} d={curve(620, CY(index), 780, 220)} /><path className={`${styles.flow} ${styles.flowLime}`} d={curve(620, CY(index), 780, 220)} /></g>)}
        {SOURCES.map((node, index) => <g className={styles.node} key={node.title.pt} style={{ '--i': index } as CSSProperties}>
          <rect fill="rgb(15 23 42)" height="50" rx="10" stroke="rgb(103 232 249 / .55)" width="220" x="10" y={CY(index) - 25} />
          <text fill="#f1f5f9" fontSize="15" fontWeight="700" x="22" y={CY(index) - 4}>{pick(node.title, en)}</text>
          <text fill="#94a3b8" fontFamily={level === 'technical' ? 'ui-monospace, monospace' : undefined} fontSize="11.5" x="22" y={CY(index) + 15}>{sub(node)}</text>
        </g>)}
        {STEPS.map((node, index) => <g className={styles.node} key={node.title.pt} style={{ '--i': index + 6 } as CSSProperties}>
          <rect fill="rgb(15 23 42)" height="50" rx="10" stroke="rgb(190 242 100 / .5)" width="230" x="390" y={CY(index) - 25} />
          <text fill="#f1f5f9" fontSize="15" fontWeight="700" x="402" y={CY(index) - 4}>{pick(node.title, en)}</text>
          <text fill="#94a3b8" fontFamily={level === 'technical' ? 'ui-monospace, monospace' : undefined} fontSize="11.5" x="402" y={CY(index) + 15}>{sub(node)}</text>
        </g>)}
        <g className={styles.node} style={{ '--i': 13 } as CSSProperties}>
          <rect fill="rgb(15 23 42)" height="210" rx="14" stroke="rgb(252 211 77 / .6)" width="210" x="780" y="115" />
          <text fill="#f1f5f9" fontSize="17" fontWeight="700" x="796" y="146">{en ? 'Scenarios A · B · C' : 'Cenários A · B · C'}</text>
          <text fill="#94a3b8" fontSize="12" x="796" y="166">{en ? 'month by month, with source' : 'mês a mês, com fonte'}</text>
          {chips.map((chip, index) => <g className={styles.chip} key={chip.label} style={{ '--i': index } as CSSProperties}>
            <rect fill={chip.fill} height="32" rx="16" width="170" x="800" y={184 + index * 44} />
            <text fill={chip.text} fontSize="14" fontWeight="700" textAnchor="middle" x="885" y={205 + index * 44}>{chip.label}</text>
          </g>)}
        </g>
      </svg>
    </figure>
    <div className="mt-5 grid gap-4 md:grid-cols-3">
      {columns.map((column) => <section aria-label={column.title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4" key={column.title}>
        <h3 className="font-mono text-sm font-bold text-lime-300">{column.title}</h3>
        <ul className="mt-2 grid gap-1.5 text-sm">{column.items.map((node) => <li key={node.title.pt}><b className="text-slate-100">{pick(node.title, en)}</b> <span className={`text-slate-400 ${level === 'technical' ? 'font-mono text-xs' : ''}`}>— {sub(node)}</span></li>)}</ul>
      </section>)}
      <section aria-label={en ? '3 · Result' : '3 · Resultado'} className="rounded-xl border border-slate-700 bg-slate-900/70 p-4">
        <h3 className="font-mono text-sm font-bold text-lime-300">{en ? '3 · Result' : '3 · Resultado'}</h3>
        <dl className="mt-2 grid gap-2 text-sm">
          <div><dt className="font-bold text-lime-200">{en ? 'Compatible' : 'Compatível'}</dt><dd className="text-slate-300">{level === 'technical' ? (en ? 'Monthly median T2M inside the crop’s sourced viable range (margin ≥ 0).' : 'Mediana mensal de T2M dentro da faixa viável com fonte (margem ≥ 0).') : (en ? 'The month’s typical temperature fits the crop’s documented range.' : 'A temperatura típica do mês cabe na faixa documentada da cultura.')}</dd></div>
          <div><dt className="font-bold text-amber-200">{en ? 'Attention' : 'Atenção'}</dt><dd className="text-slate-300">{level === 'technical' ? (en ? 'Margin < 0; separate attention notes for frost (Tmin ≤ 2 °C), bare soil × erosive months × mean slope ≥ 8%.' : 'Margem < 0; avisos à parte para geada (Tmín ≤ 2 °C) e solo exposto × meses erosivos × declive médio ≥ 8%.') : (en ? 'Outside the range, or a risk to look at: frost, bare soil in heavy-rain months on slopes.' : 'Fora da faixa, ou um risco a olhar: geada, solo descoberto em mês de chuva forte em terreno inclinado.')}</dd></div>
          <div><dt className="font-bold text-slate-200">N/D</dt><dd className="text-slate-300">{en ? 'Missing data or missing sourced range. Never counted as “ok”.' : 'Falta dado ou faixa com fonte. Nunca conta como “ok”.'}</dd></div>
        </dl>
      </section>
    </div>
  </div>;
}
