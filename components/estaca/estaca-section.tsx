'use client';

import dynamic from 'next/dynamic';
import { useLocale } from '@/components/locale-provider';
import { JoaoNote } from '@/components/joao/joao-note';
import { EstacaDevices } from '@/components/estaca/estaca-devices';
import { EstacaRequestForm } from '@/components/estaca/estaca-request-form';

const EstacaViewer = dynamic(() => import('@/components/estaca/estaca-viewer'), {
  ssr: false,
  loading: () => <div aria-hidden="true" className="h-[420px] rounded-2xl border border-[#879c80] bg-[#e1ead7]" />,
});

const goto = (id: string) => (event: React.MouseEvent) => {
  const el = document.getElementById(id);
  if (!el) return;
  event.preventDefault();
  el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};

const Eyebrow = ({ children }: { children: string }) => <p className="text-xs font-bold tracking-[0.16em] text-lime-300"><span aria-hidden="true" className="mr-2 inline-block h-[7px] w-[7px] rounded-full bg-lime-300" />{children}</p>;

export function EstacaSection() {
  const { locale } = useLocale();
  const en = locale === 'en';
  const features = en ? [
    ['◒', 'Soil moisture', 'The capacitive probe tracks moisture variation at the installation spot.'],
    ['♨', 'Air temperature', 'The KY-013 sensor sits in a ventilated shelter on the side of the box.'],
    ['◈', 'Rain detection', 'The FC-37 detects wetness on the exposed plate, without estimating rainfall volume.'],
  ] : [
    ['◒', 'Umidade do solo', 'A sonda capacitiva acompanha a variação da umidade no local de instalação.'],
    ['♨', 'Temperatura do ar', 'O sensor KY-013 fica em um abrigo ventilado na lateral da caixa.'],
    ['◈', 'Detecção de chuva', 'O FC-37 detecta molhamento na placa exposta, sem estimar volume de precipitação.'],
  ];
  return <div id="estaca" className="border-t border-slate-800 pt-12">
    <JoaoNote
      happening={en
        ? 'This stake is a prototype that complements the soil information the platform already uses (NASA and historical climate and soil data). It adds real measurements from your own field: soil moisture, air temperature and rain detection. With them, the database gets richer and the rotation decision can rest on more confidence.'
        : 'Esta estaca é um protótipo que complementa as informações de solo que a plataforma já usa (dados históricos de clima e solo da NASA). Ela traz medições reais do seu próprio campo: umidade do solo, temperatura do ar e detecção de chuva. Com elas, a base de dados fica mais rica e a decisão de rotação pode ter mais confiança.'}
      limit={en
        ? 'It is a prototype and the data shown here is fictitious (demo). It measures a single point, does not estimate rainfall volume and does not replace the analysis.'
        : 'É um protótipo e os dados mostrados aqui são fictícios (demonstração). Ela mede um único ponto, não estima o volume de chuva e não substitui a análise.'}
    />
    <section className="grid gap-10 py-10 md:grid-cols-2 md:items-center md:gap-14" aria-labelledby="estaca-title">
      <div>
        <Eyebrow>{en ? 'FIELD MONITORING' : 'MONITORAMENTO DE CAMPO'}</Eyebrow>
        <h2 id="estaca-title" className="mt-4 text-3xl font-bold leading-tight tracking-tight text-cream sm:text-4xl lg:text-5xl">{en ? 'See what happens on your farm.' : 'Veja o que acontece na sua fazenda.'}</h2>
        <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">{en ? 'A stake that brings together soil moisture, air temperature and rain detection at the spot you need to follow.' : 'Uma estaca que reúne umidade do solo, temperatura do ar e detecção de chuva no ponto onde você precisa acompanhar.'}</p>
        <div className="mt-7 flex flex-wrap items-center gap-x-5 gap-y-3">
          <a href="#dispositivos" onClick={goto('dispositivos')} className="inline-flex items-center gap-3 rounded-lg bg-lime-300 px-4 py-3 font-bold text-slate-950 hover:bg-lime-200">{en ? 'See devices' : 'Ver dispositivos'} <span aria-hidden="true">↗</span></a>
          <a href="#solicitar" onClick={goto('solicitar')} className="text-sm text-cream hover:text-lime-300">{en ? 'Request a stake' : 'Solicitar uma estaca'} <span aria-hidden="true">→</span></a>
        </div>
      </div>
      <EstacaViewer />
    </section>
    <section aria-labelledby="estaca-features" className="border-t border-slate-800 py-12">
      <Eyebrow>{en ? 'WHAT THE STAKE MEASURES' : 'O QUE A ESTACA MEDE'}</Eyebrow>
      <h2 id="estaca-features" className="mt-4 text-3xl font-bold tracking-tight text-cream sm:text-4xl">{en ? 'Three readings. One point in the field.' : 'Três leituras. Um ponto no campo.'}</h2>
      <div className="mt-6 grid gap-3 sm:grid-cols-3">{features.map(([glyph, title, text]) => <article key={title} className="rounded-xl border border-slate-700 bg-slate-900/70 p-5"><span aria-hidden="true" className="text-2xl text-lime-300">{glyph}</span><h3 className="mt-2 text-lg font-bold text-cream">{title}</h3><p className="mt-1 text-slate-300">{text}</p></article>)}</div>
    </section>
    <EstacaDevices />
    <section id="solicitar" aria-labelledby="estaca-request" className="grid scroll-mt-24 gap-8 border-t border-slate-800 py-12 md:grid-cols-2 md:items-center">
      <div>
        <Eyebrow>{en ? 'TAKE IT TO THE FIELD' : 'LEVE PARA O CAMPO'}</Eyebrow>
        <h2 id="estaca-request" className="mt-4 text-3xl font-bold leading-tight tracking-tight text-cream sm:text-4xl">{en ? 'Install a stake on your property.' : 'Instale uma estaca na sua propriedade.'}</h2>
        <p className="mt-4 text-slate-300">{en ? 'Share your contact and where you plan to install the device.' : 'Informe seu contato e onde você pretende instalar o dispositivo.'}</p>
      </div>
      <EstacaRequestForm />
    </section>
  </div>;
}
