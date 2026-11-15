'use client';

import { useState, type ReactNode } from 'react';
import { useLocale } from '@/components/locale-provider';
import type { Level } from '@/components/methodology/content';
import { CrosswalkSection } from '@/components/methodology/crosswalk-section';
import { LevelSwitch } from '@/components/methodology/level-switch';
import { LimitsSection } from '@/components/methodology/limits-section';
import type { PilotExample } from '@/components/methodology/pilot-example';
import { PipelineDiagram } from '@/components/methodology/pipeline-diagram';
import { SlopeExplainer } from '@/components/methodology/slope-explainer';
import { SourceCards } from '@/components/methodology/source-cards';
import { WaterBalanceChart } from '@/components/methodology/water-balance-chart';

function Section({ id, kicker, title, lead, children }: { id: string; kicker: string; title: string; lead: string; children: ReactNode }) {
  return <section aria-labelledby={id} className="mt-14">
    <p className="font-mono text-sm font-bold text-lime-300">{kicker}</p>
    <h2 className="mt-1 text-2xl font-bold" id={id}>{title}</h2>
    <p className="mt-2 max-w-3xl text-slate-300">{lead}</p>
    {children}
  </section>;
}

export function MethodologyView({ example }: { example: PilotExample | null }) {
  const { locale, copy } = useLocale();
  const en = locale === 'en';
  const [level, setLevel] = useState<Level>('simple');
  const tech = level === 'technical';
  return <section className="mx-auto max-w-6xl">
    <h1 className="page-title font-bold">{copy.methodTitle}</h1>
    <p className="mt-4 max-w-3xl text-lg leading-8 text-slate-300">{en ? 'What goes in, how it is used, and what it cannot tell you. Pick how deep you want to read.' : 'O que entra, como é usado e o que não dá para afirmar. Escolha a profundidade da leitura.'}</p>
    <LevelSwitch en={en} level={level} onChange={setLevel} />

    <Section id="m-pipeline" kicker="01" lead={tech
      ? (en ? 'Live NASA POWER daily point (or the SHA-256-verified fixture only at the exact pilot point), one OpenTopoData SRTM request and static IBGE/ZARC/PAM/SoilGrids indexes run in parallel in /api/analyze; pure engine functions build scenarios A/B/C.' : 'NASA POWER diário ao vivo (ou o arquivo verificado por SHA-256 só no ponto piloto exato), uma consulta SRTM no OpenTopoData e índices estáticos IBGE/ZARC/PAM/SoilGrids rodam em paralelo em /api/analyze; funções puras do motor montam os cenários A/B/C.')
      : (en ? 'Satellites and official data go in, documented calculations run, and each month of each plan gets a clear label.' : 'Entram satélites e dados oficiais, rodam cálculos documentados, e cada mês de cada plano recebe um rótulo claro.')}
      title={en ? 'From satellite to result' : 'Do satélite ao resultado'}>
      <PipelineDiagram en={en} level={level} />
    </Section>

    <Section id="m-water" kicker="02" lead={en ? 'Does rain cover what the air pulls out of the ground? Real numbers from one place, as an example.' : 'A chuva cobre o que o ar tira do chão? Números reais de um lugar, como exemplo.'} title={en ? 'Rain × ET0: the water balance' : 'Chuva × ET0: o balanço de água'}>
      <WaterBalanceChart en={en} example={example} level={level} />
    </Section>

    <Section id="m-slope" kicker="03" lead={en ? 'Slope comes from NASA SRTM elevation. Try it: the class and the attention mark follow the same thresholds as the app.' : 'A declividade vem da altitude do NASA SRTM. Experimente: a classe e o ponto de atenção seguem os mesmos limites do app.'} title={en ? 'Relief and erosion' : 'Relevo e erosão'}>
      <SlopeExplainer en={en} level={level} />
    </Section>

    <Section id="m-sources" kicker="04" lead={en ? 'Each source: what it gives, why we chose it and where it stops.' : 'Cada fonte: o que dá, por que escolhemos e onde ela para.'} title={en ? 'Where the data comes from' : 'De onde vêm os dados'}>
      <SourceCards en={en} level={level} />
    </Section>

    <Section id="m-crosswalk" kicker="05" lead={en ? 'Every resource suggested by the NASA Space Apps challenge, and what FieldShift does with it in Brazil.' : 'Cada recurso sugerido pelo desafio NASA Space Apps e o que o FieldShift faz com ele no Brasil.'} title={en ? 'Challenge resources × FieldShift' : 'Recursos do desafio × FieldShift'}>
      <CrosswalkSection en={en} level={level} />
    </Section>

    <LimitsSection en={en} level={level} />
    <p className="mt-8 text-sm text-slate-400">{copy.sources} {en ? 'Challenge resource map: docs/DATA_CROSSWALK.md.' : 'Mapa dos recursos do desafio: docs/DATA_CROSSWALK.md.'}</p>
  </section>;
}
