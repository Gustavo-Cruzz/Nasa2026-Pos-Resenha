import type { StyleSpecification } from 'maplibre-gl';

/** Local, data-free MapLibre style. The runtime texture is decorative only. */
export const fieldShiftMapStyle: StyleSpecification = {
  version: 8,
  name: 'Field Shift neutral coordinate canvas',
  metadata: { 'field-shift:purpose': 'decorative-coordinate-selection-only', 'field-shift:data': 'none' },
  sources: {},
  layers: [{ id: 'field-shift-neutral-background', type: 'background', paint: { 'background-color': '#142018' } }],
};
