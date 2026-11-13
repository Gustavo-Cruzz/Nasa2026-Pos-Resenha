import Image from 'next/image';

const sprite: Record<string, string> = {
  soybean: 'soybean', maize: 'corn', sorghum: 'sorghum', sunflower: 'sunflower',
  cowpea: 'cowpea', pearl_millet: 'millet', ruziziensis: 'brachiaria', sunn_hemp: 'sunn-hemp',
  cotton: 'cotton', pigeon_pea: 'pigeon-pea',
  common_bean: 'common-bean', upland_rice: 'upland-rice',
};

export function CropSprite({ cropId, size = 64 }: { cropId: string; name: string; size?: number }) {
  const file = sprite[cropId];
  if (!file) return <Image alt="" className="shrink-0 object-contain [image-rendering:pixelated]" height={size} src="/assets/interactions/unknown-placeholder.png" width={size} />;
  return <Image alt="" className="shrink-0 object-contain [image-rendering:pixelated]" height={size} src={`/assets/crops/${file}.png`} width={size} />;
}
