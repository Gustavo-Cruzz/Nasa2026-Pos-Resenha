import { MARK_SIZE, markRects } from '@/lib/brand/mark';

const rects = markRects();

/** The Plantaê symbol: pixel-art sprout, sun and soil. Decorative unless a title is given. */
export function PlantaeMark({ size = 32, title, className }: { size?: number; title?: string; className?: string }) {
  return <svg aria-hidden={title ? undefined : true} aria-label={title} className={className} height={size} role={title ? 'img' : undefined} shapeRendering="crispEdges" viewBox={`0 0 ${MARK_SIZE} ${MARK_SIZE}`} width={size}>{rects.map((rect) => <rect fill={rect.fill} height="1" key={`${rect.x}-${rect.y}`} width={rect.w} x={rect.x} y={rect.y} />)}</svg>;
}
