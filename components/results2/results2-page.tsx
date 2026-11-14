'use client';

import { useRef } from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarDays, CheckCircle2, CloudSun, Database, Droplets, FlaskConical, Layers, Mountain, Repeat, Sprout, TriangleAlert, MapPin, ChevronsUpDown } from 'lucide-react';
import { CropSprite } from '@/components/crops/crop-sprite';
import { MonthlyChart, type MonthPoint } from '@/components/atlas/monthly-chart';
import { Chip, Drawer, Explain } from '@/components/results2/drawer';
import { CalendarVisual, NdviVisual, RotationVisual, ScaleVisual, SoilVisual, WaterVisual } from '@/components/results2/visuals';

/** MOCK DATA: illustrative values for the layout only. Nothing here is computed from the engine. */
const FARM = { place: 'Luís Eduardo Magalhães (BA)', current: { id: 'soybean', name: 'Soja' }, previous: { id: 'maize', name: 'Milho' } };
const RAIN = [148, 142, 182, 82, 18, 2, 0, 1, 3, 61, 167, 183];
const TEMP = [24.3, 24.3, 24.3, 24.6, 24.7, 23.8, 23.3, 24.9, 27.3, 28.3, 25.2, 24.8];
const POINTS: MonthPoint[] = RAIN.map((rainMm, i) => ({ month: i + 1, rainMm, tempC: TEMP[i] }));
const OPTIONS = [
  { id: 'maize', name: 'Milho', tone: 'ok' as const, status: 'Combina bem', reason: 'Temperatura dentro da faixa e chuva concentrada de novembro a abril.', top: true },
  { id: 'sorghum', name: 'Sorgo', tone: 'ok' as const, status: 'Combina', reason: 'Tolera melhor períodos mais secos; boa alternativa de cobertura.', top: false },
  { id: 'cowpea', name: 'Feijão-caupi', tone: 'attention' as const, status: 'Atenção', reason: 'Funciona no calor, mas a janela de chuva é mais curta.', top: false },
];

export function Results2Page() {
  const drawers = useRef<HTMLDivElement>(null);
  const setAll = (open: boolean) => drawers.current?.querySelectorAll('details').forEach((item) => { item.open = open; });
  return <section className="mx-auto max-w-5xl">
    <p className="flex items-start gap-2 rounded-xl border border-amber-300/40 bg-amber-950/20 p-3 text-sm text-amber-100"><TriangleAlert aria-hidden="true" className="mt-0.5 shrink-0" size={18} /><span><b>Protótipo visual.</b> Os números e as sugestões desta página são de exemplo, só para testar o layout. Ainda não vêm do cálculo real.</span></p>

    <header className="mt-6">
      <p className="text-sm font-semibold text-lime-200">Resultado da sua fazenda</p>
      <h1 className="page-title font-bold">Seu próximo plantio</h1>
      <ul className="mt-4 flex flex-wrap gap-2 text-sm">
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><MapPin aria-hidden="true" className="text-lime-300" size={14} />{FARM.place}</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={FARM.current.id} name={FARM.current.name} size={18} />Agora: {FARM.current.name}</li>
        <li className="inline-flex items-center gap-1.5 rounded-full border border-slate-600 bg-slate-900/70 px-3 py-1.5"><CropSprite cropId={FARM.previous.id} name={FARM.previous.name} size={18} />Antes: {FARM.previous.name}</li>
      </ul>
    </header>

    <section aria-label="Sugestão para o próximo plantio" className="mt-6 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
      <article className="rounded-2xl border-2 border-lime-300/70 bg-gradient-to-br from-lime-300/10 to-slate-900/60 p-5 sm:p-6">
        <p className="text-sm font-bold uppercase tracking-wide text-lime-200">Sugestão para começar a pensar</p>
        <div className="mt-3 flex items-center gap-4">
          <span className="grid h-24 w-24 shrink-0 place-items-center rounded-2xl bg-slate-950/50"><CropSprite cropId="maize" name="Milho" size={72} /></span>
          <div><h2 className="text-4xl font-bold leading-none">Milho</h2><p className="mt-2 text-slate-200">2ª safra · plantio em <b className="text-lime-200">novembro a janeiro</b></p><div className="mt-2"><Chip tone="ok">Combina bem com o seu clima</Chip></div></div>
        </div>
        <ul className="mt-5 grid gap-2 text-sm">{['A temperatura do seu local fica dentro da faixa da cultura.', 'A chuva se concentra de novembro a abril, quando o milho mais precisa.', 'Vem depois da soja: alterna leguminosa e gramínea.'].map((reason) => <li className="flex gap-2" key={reason}><CheckCircle2 aria-hidden="true" className="mt-0.5 shrink-0 text-cyan-300" size={17} />{reason}</li>)}</ul>
      </article>
      <div className="grid gap-3 content-start">
        <p className="text-sm font-bold text-slate-300">Outras opções para comparar</p>
        {OPTIONS.filter((option) => !option.top).map((option) => <article className="flex items-center gap-3 rounded-xl border border-slate-700 bg-slate-900/70 p-4" key={option.id}><CropSprite cropId={option.id} name={option.name} size={44} /><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{option.name}</h3><Chip tone={option.tone}>{option.status}</Chip></div><p className="mt-1 text-sm text-slate-300">{option.reason}</p></div></article>)}
      </div>
    </section>

    <div className="mt-10 flex flex-wrap items-end justify-between gap-3">
      <div><h2 className="text-2xl font-bold">Entenda o porquê, tema por tema</h2><p className="mt-1 text-slate-300">Abra a gaveta que quiser. Cada uma explica um pedaço da sugestão.</p></div>
      <div className="flex gap-2 text-sm"><button className="inline-flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-2 font-semibold hover:border-lime-300" onClick={() => setAll(true)} type="button"><ChevronsUpDown aria-hidden="true" size={15} />Abrir tudo</button><button className="rounded-lg border border-slate-600 px-3 py-2 font-semibold hover:border-lime-300" onClick={() => setAll(false)} type="button">Fechar tudo</button></div>
    </div>

    <div className="mt-4 grid gap-3" ref={drawers}>
      <Drawer defaultOpen icon={<CloudSun size={24} />} status="Combina" takeaway="Chuva e calor ajudam de novembro a abril." title="Clima do local" tone="ok">
        <Explain limit="Não é previsão: mostra o que costuma acontecer, com base em 15 anos de dados da NASA." points={['As barras são a chuva de cada mês.', 'A linha é a temperatura média do mês.', 'O mês marcado é o atual.']} words="Clima é o que costuma acontecer em cada mês. Aqui, a chuva se concentra de novembro a abril e quase não chove de junho a setembro. A temperatura varia pouco o ano todo." />
        <div><MonthlyChart currentMonth={11} history="mediana 2011–2025" points={POINTS} /></div>
      </Drawer>

      <Drawer icon={<CalendarDays size={24} />} status="Nov a Jan" takeaway="Os melhores meses para semear são do começo das chuvas." title="Janela de plantio" tone="ok">
        <Explain limit="A janela vem das faixas de temperatura de cada cultura. Ela não considera preço, pragas nem a sua máquina." points={['Azul: o mês combina com a cultura.', 'Amarelo: dá para plantar, mas com cuidado.', 'Cinza: ainda não temos dado confiável.']} words="É o calendário de quando cada cultura costuma se dar bem aqui. Quanto mais azul na linha, mais meses boas para semear." />
        <CalendarVisual ringMonth={11} rows={[{ cropId: 'maize', name: 'Milho', cells: 'ccaaannnaacc' }, { cropId: 'sorghum', name: 'Sorgo', cells: 'cccaannnaacc' }, { cropId: 'cowpea', name: 'Caupi', cells: 'ccccannnaacc' }]} />
      </Drawer>

      <Drawer icon={<Droplets size={24} />} status="Atenção jun–set" takeaway="De junho a setembro a evaporação passa a chuva." title="Água disponível" tone="attention">
        <Explain limit="É um retrato do clima, não a necessidade de água da cultura nem uma indicação de irrigar." points={['Evaporação é a água que o sol e o vento “tiram” do chão e das plantas.', 'Barras para cima: chove mais do que evapora.', 'Barras para baixo: evapora mais do que chove.']} words="Compara quanta água chega do céu com quanta evapora. Nos meses com sobra, o solo guarda água. Nos meses com falta, ele seca." />
        <WaterVisual balance={[40, 30, 70, -5, -45, -70, -80, -95, -90, -40, 60, 95]} />
      </Drawer>

      <Drawer icon={<Layers size={24} />} status="2 pontos" takeaway="Você relatou água empoçada e solo duro." title="Solo" tone="attention">
        <Explain limit="O app não diagnostica o solo. Isto é só o que você contou; quem confirma é um técnico." points={['Anote onde e quando acontece.', 'Uma análise de solo mostra o que está por trás.']} words="O solo guarda a água e os nutrientes da planta. Os dois sinais que você observou valem uma conversa com um técnico antes de plantar." />
        <SoilVisual items={[{ title: 'Água empoçada', icon: Droplets, meaning: 'Costuma ter relação com o escoamento da água ou com camadas que seguram a chuva na superfície.' }, { title: 'Solo duro', icon: FlaskConical, meaning: 'Pode indicar compactação, que dificulta a raiz de descer e a água de entrar.' }]} />
      </Drawer>

      <Drawer icon={<Repeat size={24} />} status="Alterna bem" takeaway="Milho depois de soja é uma troca de famílias." title="Rotação de culturas" tone="ok">
        <Explain limit="É uma regra geral de manejo. Ela não garante colheita maior." points={['Plantar a mesma coisa sempre cansa o solo.', 'Trocar de família ajuda a manter a terra saudável.']} words="Rotação é revezar as culturas na mesma área. Depois de uma leguminosa, como a soja, uma gramínea, como o milho, costuma ser uma boa troca." />
        <RotationVisual steps={[{ when: 'Antes', cropId: 'maize', name: 'Milho', family: 'Gramínea' }, { when: 'Agora', cropId: 'soybean', name: 'Soja', family: 'Leguminosa' }, { when: 'Próximo', cropId: 'maize', name: 'Milho', family: 'Gramínea', highlight: true }]} />
      </Drawer>

      <Drawer icon={<Mountain size={24} />} status="Atenção" takeaway="Declive suave, mas com chuva forte e concentrada." title="Relevo e erosão" tone="attention">
        <Explain limit="Mostra o risco do terreno e da chuva, não a perda de solo real. Isso exige dados que o app ainda não tem." points={['Declive: o quanto o terreno inclina.', 'Chuva agressiva: chove forte e de uma vez, e a enxurrada leva o solo.']} words="Terreno inclinado e chuva forte juntos aumentam a erosão. O seu terreno é pouco inclinado, mas a chuva é concentrada e merece atenção com a cobertura do solo." />
        <div className="grid gap-6"><ScaleVisual classes={[{ label: 'Plano', from: '0–3%', tone: 'bg-cyan-300' }, { label: 'Suave', from: '3–8%', tone: 'bg-cyan-200' }, { label: 'Ondulado', from: '8–13%', tone: 'bg-amber-200' }, { label: 'Forte', from: '13–20%', tone: 'bg-amber-300' }, { label: 'Muito forte', from: '20%+', tone: 'bg-amber-400' }]} markerLabel="5%" position={0.32} title="Inclinação do terreno" /><ScaleVisual classes={[{ label: 'Baixa', from: '<60', tone: 'bg-cyan-300' }, { label: 'Moderada', from: '60–90', tone: 'bg-cyan-200' }, { label: 'Alta', from: '90–120', tone: 'bg-amber-200' }, { label: 'Muito alta', from: '120–160', tone: 'bg-amber-300' }, { label: 'Extrema', from: '160+', tone: 'bg-amber-400' }]} markerLabel="138" note="Índice de Fournier: mede o quanto a chuva é concentrada." position={0.72} title="Agressividade da chuva" /></div>
      </Drawer>

      <Drawer icon={<Sprout size={24} />} status="Verde" takeaway="A vegetação fica forte de novembro a abril." title="Vegetação vista do satélite" tone="ok">
        <Explain limit="Mostra o verde da paisagem na região, não a sua lavoura." points={['Perto de 0,2: pouco verde, solo exposto.', 'Perto de 0,8: vegetação densa e saudável.']} words="O satélite mede o quanto a vegetação está verde. É um bom sinal de quando a região “acorda” com as chuvas." />
        <NdviVisual values={[0.78, 0.8, 0.82, 0.74, 0.58, 0.42, 0.34, 0.32, 0.36, 0.48, 0.66, 0.76]} />
      </Drawer>

      <Drawer icon={<Database size={24} />} status="6 fontes" takeaway="Tudo vem de bases públicas e abertas." title="De onde vêm os dados" tone="info">
        <Explain limit="Dados de satélite e de modelo têm margem de erro. Use como ponto de partida, não como decisão final." words="Cada informação desta página tem uma fonte pública. Você pode abrir a Metodologia para ver o detalhe de cada uma." />
        <ul className="grid content-start gap-2 text-sm sm:grid-cols-2">{[['NASA POWER', 'Clima: chuva, temperatura, vento'], ['NASA MODIS', 'Verde da vegetação'], ['SRTM + Embrapa', 'Relevo e declive'], ['IBGE', 'Município e malha'], ['ZARC / PAM', 'Zoneamento e produção'], ['Catálogo de culturas', 'Faixas de cada cultura']].map(([name, use]) => <li className="rounded-lg bg-slate-950/50 p-3" key={name}><b className="block">{name}</b><span className="text-slate-400">{use}</span></li>)}</ul>
      </Drawer>
    </div>

    <section aria-label="Próximos passos" className="mt-10 rounded-2xl border border-slate-700 bg-slate-900/60 p-5">
      <h2 className="text-xl font-bold">E agora?</h2>
      <ul className="mt-3 grid gap-2 text-slate-200 sm:grid-cols-3">{['Converse com um técnico sobre o solo.', 'Compare com outra cidade ou outra safra.', 'Volte em alguns meses: o clima muda.'].map((step, i) => <li className="flex gap-3 rounded-lg bg-slate-950/50 p-3" key={step}><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lime-300 text-sm font-bold text-slate-950">{i + 1}</span>{step}</li>)}</ul>
      <div className="mt-4 flex flex-wrap gap-3"><Link className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-4 py-2.5 font-bold text-slate-950 hover:bg-lime-200" href="/explore">Explorar outro lugar<ArrowRight aria-hidden="true" size={18} /></Link><Link className="rounded-lg border border-slate-600 px-4 py-2.5 font-semibold hover:border-lime-300" href="/methodology">Ver a metodologia</Link></div>
    </section>
  </section>;
}
