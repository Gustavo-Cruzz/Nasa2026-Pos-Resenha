import { crops } from '@/lib/catalog';
import { CropCard } from '@/components/crops/crop-card';
export default function ResultsPage() { return <section><h1 className="text-3xl font-bold">Comparação de estratégias</h1><p className="mt-3 text-slate-300">Estratégias sem evidência regional aparecem como indisponíveis; não há scores inventados.</p><div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{crops.map((crop) => <CropCard key={crop.id} crop={crop} />)}</div></section>; }
