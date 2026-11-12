import Image from 'next/image';

const crops = [
  '/assets/crops/soybean.png',
  '/assets/crops/corn.png',
  '/assets/crops/sunflower.png',
];

/** Decorative only: it represents no field observation, crop suitability or yield. */
export function FieldAtmosphere() {
  return <div aria-hidden="true" className="field-atmosphere"><div className="field-atmosphere-sun" /><div className="field-atmosphere-hills field-atmosphere-hills-back" /><div className="field-atmosphere-hills field-atmosphere-hills-front" /><div className="field-atmosphere-rows" />{crops.map((src, index) => <Image alt="" className={`field-atmosphere-crop field-atmosphere-crop-${index + 1}`} height={72} key={src} src={src} width={72} />)}</div>;
}
