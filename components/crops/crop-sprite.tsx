import Image from 'next/image';

const sprite: Record<string, string> = {
  soybean: 'soybean', maize: 'corn', sorghum: 'sorghum', sunflower: 'sunflower',
  cowpea: 'cowpea', pearl_millet: 'millet', ruziziensis: 'brachiaria', sunn_hemp: 'sunn-hemp',
  cotton: 'cotton', pigeon_pea: 'pigeon-pea',
};

export function CropSprite({ cropId, name, size = 64 }: { cropId: string; name: string; size?: number }) {
  const file = sprite[cropId];
  if (!file) return <span aria-hidden="true" className="grid place-items-center rounded-lg bg-slate-800 text-sm font-bold" style={{ width: size, height: size }}>{name.slice(0, 1).toUpperCase()}</span>;
  return <Image alt="" className="shrink-0 object-contain [image-rendering:pixelated]" height={size} src={`/assets/crops/${file}.png`} width={size} />;
}
