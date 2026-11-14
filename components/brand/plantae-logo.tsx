import { PlantaeMark } from '@/components/brand/plantae-mark';
import { BRAND_NAME } from '@/lib/brand/mark';

/** Full signature: symbol plus the name with the "ê" in lime. `compact` shows the symbol only (name stays available to screen readers). */
export function PlantaeLogo({ compact = false, size = 36, className = '' }: { compact?: boolean; size?: number; className?: string }) {
  return <span aria-label={BRAND_NAME} className={`inline-flex items-center gap-2.5 ${className}`} role="img">
    <PlantaeMark size={size} />
    <span aria-hidden="true" className={`font-extrabold leading-none tracking-tight text-cream ${compact ? 'sr-only' : ''}`} style={{ fontSize: size * 0.62 }}>Planta<span className="text-lime-300">ê</span></span>
  </span>;
}
