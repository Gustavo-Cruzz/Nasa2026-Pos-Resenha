'use client';

import { Fragment, useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CloudSun, Database, Droplets, FlaskConical, Layers, MapPin, Mountain, Repeat, Sprout, Star, TriangleAlert } from 'lucide-react';
import { CropSprite } from '@/components/crops/crop-sprite';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { Chip, type Tone } from '@/components/results2/drawer';
import { CalendarVisual, NdviVisual, RotationVisual, ScaleVisual, SoilVisual, WaterVisual } from '@/components/results2/visuals';
import { JoaoDock, JoaoRail, useActiveBlock, type BlockComment } from '@/components/results3/joao-guide';

/** MOCK DATA: illustrative values for the layout only. Nothing here is computed from the engine. */
const FARM = { place: 'Luís Eduardo Magalhães (BA)', current: { id: 'soybean', name: 'Soja' }, previous: { id: 'maize', name: 'Milho' } };
const RAIN = [148, 142, 182, 82, 18, 2, 0, 1, 3, 61, 167, 183];
const TEMP = [24.3, 24.3, 24.3, 24.6, 24.7, 23.8, 23.3, 24.9, 27.3, 28.3, 25.2, 24.8];
const POINTS: MonthPoint[] = RAIN.map((rainMm, i) => ({ month: i + 1, rainMm, tempC: TEMP[i] }));
const OTHERS = [
  { id: 'sorghum', name: 'Sorgo', tone: 'ok' as Tone, status: 'Combina', reason: 'Tolera melhor períodos mais secos; boa alternativa de cobertura.' },
  { id: 'cowpea', name: 'Feijão-caupi', tone: 'attention' as Tone, status: 'Atenção', reason: 'Funciona no calor, mas a janela de chuva é mais curta.' },
];

/** A block of data. The page shows only this; João's comment lives beside it, outside the block. */
type Block = { id: string; title: string; takeaway: string; status: string; tone: Tone; icon: ReactNode; body: ReactNode; comment: BlockComment };

const BLOCKS: Block[] = [
  {
    id: 'start', title: 'Para começar a pensar', takeaway: '2ª safra · plantio em novembro a janeiro', status: 'Combina bem', tone: 'ok', icon: <Star size={24} />,
    body: <div>
      <div className="flex items-center gap-4"><span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-slate-950/50"><CropSprite cropId="maize" name="Milho" size={72} /></span><h3 className="text-4xl font-bold leading-none">Milho</h3></div>
      <p className="mt-5 text-sm font-bold text-slate-300">Outras opções para comparar</p>
      <div className="mt-2 grid gap-3 sm:grid-cols-2">{OTHERS.map((option) => <div className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-950/40 p-3" key={option.id}><CropSprite cropId={option.id} name={option.name} size={40} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><b>{option.name}</b><Chip tone={option.tone}>{option.status}</Chip></div><p className="mt-1 text-sm text-slate-300">{option.reason}</p></div></div>)}</div>
    </div>,
    comment: { happening: 'Olhei o clima do seu local e a sua rotação. Por isso o milho aparece primeiro.', points: ['A temperatura do seu local fica dentro da faixa da cultura.', 'A chuva se concentra de novembro a abril, quando o milho mais precisa.', 'Vem depois da soja: alterna leguminosa e gramínea.'], limit: 'É um ponto de partida para conversar com um técnico, não uma decisão pronta.' },
  },
  {
    id: 'climate', title: 'Clima do local', takeaway: 'Chuva e calor ajudam de novembro a abril.', status: 'Combina', tone: 'ok', icon: <CloudSun size={24} />,
    body: <MonthlyChart currentMonth={11} history="mediana 2011–2025" points={POINTS} />,
    comment: { happening: 'Clima é o que costuma acontecer em cada mês. Aqui, a chuva se concentra de novembro a abril e quase não chove de junho a setembro. A temperatura varia pouco o ano todo.', points: ['As barras são a chuva de cada mês.', 'A linha é a temperatura média do mês.', 'O mês marcado é o atual.'], limit: 'Não é previsão: mostra o que costuma acontecer, com base em 15 anos de dados da NASA.' },
  },
  {
    id: 'window', title: 'Janela de plantio', takeaway: 'Os melhores meses para semear são do começo das chuvas.', status: 'Nov a Jan', tone: 'ok', icon: <CalendarDays size={24} />,
    body: <CalendarVisual ringMonth={11} rows={[{ cropId: 'maize', name: 'Milho', cells: 'ccaaannnaacc' }, { cropId: 'sorghum', name: 'Sorgo', cells: 'cccaannnaacc' }, { cropId: 'cowpea', name: 'Caupi', cells: 'ccccannnaacc' }]} />,
    comment: { happening: 'É o calendário de quando cada cultura costuma se dar bem aqui. Quanto mais azul na linha, mais meses boas para semear.', points: ['Azul: o mês combina com a cultura.', 'Amarelo: dá para plantar, mas com cuidado.', 'Cinza: ainda não temos dado confiável.'], limit: 'A janela vem das faixas de temperatura de cada cultura. Ela não considera preço, pragas nem a sua máquina.' },
  },
  {
    id: 'water', title: 'Água disponível', takeaway: 'De junho a setembro a evaporação passa a chuva.', status: 'Atenção jun–set', tone: 'attention', icon: <Droplets size={24} />,
    body: <WaterVisual balance={[40, 30, 70, -5, -45, -70, -80, -95, -90, -40, 60, 95]} />,
    comment: { happening: 'Compara quanta água chega do céu com quanta evapora. Nos meses com sobra, o solo guarda água. Nos meses com falta, ele seca.', points: ['Evaporação é a água que o sol e o vento “tiram” do chão e das plantas.', 'Barras para cima: chove mais do que evapora.', 'Barras para baixo: evapora mais do que chove.'], limit: 'É um retrato do clima, não a necessidade de água da cultura nem uma indicação de irrigar.' },
  },
  {
    id: 'soil', title: 'Solo', takeaway: 'Você relatou água empoçada e solo duro.', status: '2 pontos', tone: 'attention', icon: <Layers size={24} />,
    body: <SoilVisual items={[{ title: 'Água empoçada', icon: Droplets, meaning: 'Costuma ter relação com o escoamento da água ou com camadas que seguram a chuva na superfície.' }, { title: 'Solo duro', icon: FlaskConical, meaning: 'Pode indicar compactação, que dificulta a raiz de descer e a água de entrar.' }]} />,
    comment: { happening: 'O solo guarda a água e os nutrientes da planta. Os dois sinais que você observou valem uma conversa com um técnico antes de plantar.', points: ['Anote onde e quando acontece.', 'Uma análise de solo mostra o que está por trás.'], limit: 'O app não diagnostica o solo. Isto é só o que você contou; quem confirma é um técnico.' },
  },
  {
    id: 'rotation', title: 'Rotação de culturas', takeaway: 'Milho depois de soja é uma troca de famílias.', status: 'Alterna bem', tone: 'ok', icon: <Repeat size={24} />,
    body: <RotationVisual steps={[{ when: 'Antes', cropId: 'maize', name: 'Milho', family: 'Gramínea' }, { when: 'Agora', cropId: 'soybean', name: 'Soja', family: 'Leguminosa' }, { when: 'Próximo', cropId: 'maize', name: 'Milho', family: 'Gramínea', highlight: true }]} />,
    comment: { happening: 'Rotação é revezar as culturas na mesma área. Depois de uma leguminosa, como a soja, uma gramínea, como o milho, costuma ser uma boa troca.', points: ['Plantar a mesma coisa sempre cansa o solo.', 'Trocar de família ajuda a manter a terra saudável.'], limit: 'É uma regra geral de manejo. Ela não garante colheita maior.' },
  },
  {
    id: 'terrain', title: 'Relevo e erosão', takeaway: 'Declive suave, mas com chuva forte e concentrada.', status: 'Atenção', tone: 'attention', icon: <Mountain size={24} />,
    body: <div className="grid gap-6"><ScaleVisual classes={[{ label: 'Plano', from: '0–3%', tone: 'bg-cyan-300' }, { label: 'Suave', from: '3–8%', tone: 'bg-cyan-200' }, { label: 'Ondulado', from: '8–13%', tone: 'bg-amber-200' }, { label: 'Forte', from: '13–20%', tone: 'bg-amber-300' }, { label: 'Muito forte', from: '20%+', tone: 'bg-amber-400' }]} markerLabel="5%" position={0.32} title="Inclinação do terreno" /><ScaleVisual classes={[{ label: 'Baixa', from: '<60', tone: 'bg-cyan-300' }, { label: 'Moderada', from: '60–90', tone: 'bg-cyan-200' }, { label: 'Alta', from: '90–120', tone: 'bg-amber-200' }, { label: 'Muito alta', from: '120–160', tone: 'bg-amber-300' }, { label: 'Extrema', from: '160+', tone: 'bg-amber-400' }]} markerLabel="138" note="Índice de Fournier: mede o quanto a chuva é concentrada." position={0.72} title="Agressividade da chuva" /></div>,
    comment: { happening: 'Terreno inclinado e chuva forte juntos aumentam a erosão. O seu terreno é pouco inclinado, mas a chuva é concentrada e merece atenção com a cobertura do solo.', points: ['Declive: o quanto o terreno inclina.', 'Chuva agressiva: chove forte e de uma vez, e a enxurrada leva o solo.'], limit: 'Mostra o risco do terreno e da chuva, não a perda de solo real. Isso exige dados que o app ainda não tem.' },
  },
  {
    id: 'vegetation', title: 'Vegetação vista do satélite', takeaway: 'A vegetação fica forte de novembro a abril.', status: 'Verde', tone: 'ok', icon: <Sprout size={24} />,
    body: <NdviVisual values={[0.78, 0.8, 0.82, 0.74, 0.58, 0.42, 0.34, 0.32, 0.36, 0.48, 0.66, 0.76]} />,
    comment: { happening: 'O satélite mede o quanto a vegetação está verde. É um bom sinal de quando a região “acorda” com as chuvas.', points: ['Perto de 0,2: pouco verde, solo exposto.', 'Perto de 0,8: vegetação densa e saudável.'], limit: 'Mostra o verde da paisagem na região, não a sua lavoura.' },
  },
  {
    id: 'sources', title: 'De onde vêm os dados', takeaway: 'Tudo vem de bases públicas e abertas.', status: '6 fontes', tone: 'info', icon: <Database size={24} />,
    body: <ul className="grid content-start gap-2 text-sm sm:grid-cols-2">{[['NASA POWER', 'Clima: chuva, temperatura, vento'], ['NASA MODIS', 'Verde da vegetação'], ['SRTM + Embrapa', 'Relevo e declive'], ['IBGE', 'Município e malha'], ['ZARC / PAM', 'Zoneamento e produção'], ['Catálogo de culturas', 'Faixas de cada cultura']].map(([name, use]) => <li className="rounded-lg bg-slate-950/50 p-3" key={name}><b className="block">{name}</b><span className="text-slate-400">{use}</span></li>)}</ul>,
    comment: { happening: 'Cada informação desta página tem uma fonte pública. Você pode abrir a Metodologia para ver o detalhe de cada uma.', limit: 'Dados de satélite e de modelo têm margem de erro. Use como ponto de partida, não como decisão final.' },
  },
];

const IDS = BLOCKS.map((block) => block.id);

export function Results3Page() {
  const [guide, setGuide] = useState(true);
  const activeId = useActiveBlock(IDS);
  const active = useMemo(() => BLOCKS.find((block) => block.id === activeId) ?? null, [activeId]);
  return <section className="mx-auto max-w-6xl pb-28 lg:pb-0">
    <p className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><span><b>Protótipo visual 3.</b> Os números e as sugestões desta página são de exemplo, só para testar o layout e o João. Ainda não vêm do cálculo real.</span></p>

    <header className="mt-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-sm font-semibold text-lime-200">Resultado da sua fazenda</p>
        <h1 className="page-title font-bold">Seu próximo plantio</h1>
        <ul className="mt-4 flex flex-wrap gap-2 text-sm">
          <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><MapPin aria-hidden="true" className="text-lime-300" size={14} />{FARM.place}</li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={FARM.current.id} name={FARM.current.name} size={18} />Agora: {FARM.current.name}</li>
          <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={FARM.previous.id} name={FARM.previous.name} size={18} />Antes: {FARM.previous.name}</li>
        </ul>
      </div>
      <button aria-checked={guide} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-slate-600 px-4 text-sm font-semibold hover:border-lime-300" onClick={() => setGuide((current) => !current)} role="switch" type="button">
        <span aria-hidden="true" className={`relative h-5 w-9 rounded-full transition-colors motion-reduce:transition-none ${guide ? 'bg-lime-300' : 'bg-slate-600'}`}><span className={`absolute top-0.5 h-4 w-4 rounded-full bg-slate-950 transition-all motion-reduce:transition-none ${guide ? 'left-[1.15rem]' : 'left-0.5'}`} /></span>
        Comentários do João
      </button>
    </header>

    <div className={`mt-8 grid gap-y-6 ${guide ? 'lg:grid-cols-[minmax(0,1fr)_21rem] lg:gap-x-8' : ''}`}>
      {BLOCKS.map((block) => <Fragment key={block.id}>
        <article className={`min-w-0 self-start rounded-2xl border bg-slate-900/70 p-4 transition-colors motion-reduce:transition-none sm:p-5 ${guide && activeId === block.id ? 'border-lime-300/70' : 'border-slate-700'}`} data-joao-block id={`block-${block.id}`}>
          <header className="flex items-center gap-3">
            <span aria-hidden="true" className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-800 text-lime-200">{block.icon}</span>
            <div className="min-w-0 flex-1"><h2 className="text-lg font-bold leading-tight">{block.title}</h2><p className="mt-0.5 text-sm text-slate-300">{block.takeaway}</p></div>
            <Chip tone={block.tone}>{block.status}</Chip>
          </header>
          <div className="mt-5 min-w-0">{block.body}</div>
        </article>
        {guide ? <JoaoRail active={activeId === block.id} comment={block.comment} title={block.title} /> : null}
      </Fragment>)}
    </div>

    <section aria-label="Próximos passos" className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      <h2 className="text-xl font-bold">E agora?</h2>
      <ul className="mt-3 grid gap-2 text-slate-200 sm:grid-cols-3">{['Converse com um técnico sobre o solo.', 'Compare com outra cidade ou outra safra.', 'Volte em alguns meses: o clima muda.'].map((step, index) => <li className="flex gap-3 rounded-lg bg-slate-950/50 p-3" key={step}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime-300 text-sm font-bold text-slate-950">{index + 1}</span>{step}</li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-4 py-2.5 font-bold text-slate-950 hover:bg-lime-200" href="/explore">Explorar outro lugar<ArrowRight aria-hidden="true" size={18} /></Link><Link className="rounded-lg border border-slate-600 px-4 py-2.5 font-semibold hover:border-lime-300" href="/methodology">Ver a metodologia</Link></div>
    </section>

    {guide ? <JoaoDock block={active ? { id: active.id, title: active.title, comment: active.comment } : null} /> : null}
  </section>;
}
