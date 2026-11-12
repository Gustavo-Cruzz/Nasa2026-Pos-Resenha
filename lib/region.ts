import type { Coordinates } from '@/lib/schema';

export const RIO_VERDE_PILOT = {
  id: 'rio-verde-go',
  label: 'Rio Verde (GO)',
  coordinates: { latitude: -17.798, longitude: -50.919 },
  coordinateTolerance: 0.000_001,
} as const;

export function isPilotLocation(coordinates: Coordinates): boolean {
  return Math.abs(coordinates.latitude - RIO_VERDE_PILOT.coordinates.latitude) <= RIO_VERDE_PILOT.coordinateTolerance
    && Math.abs(coordinates.longitude - RIO_VERDE_PILOT.coordinates.longitude) <= RIO_VERDE_PILOT.coordinateTolerance;
}
