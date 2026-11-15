import type { DatabaseSync } from 'node:sqlite';
import { analysisInputSchema, type AnalysisInput } from '@/lib/schema';
import type { FarmPayload } from '@/lib/farm/schema';

export type FarmRecord = { id: number; name: string; placeLabel: string | null; input: AnalysisInput; createdAt: string; updatedAt: string };
type FarmRow = { id: number; name: string; place_label: string | null; input_json: string; created_at: string; updated_at: string };

/**
 * Saves the user's farm (one per user: saving again updates it). The full validated input is kept as JSON so the analysis
 * can run again, and the main fields and the crop history are also stored in their own columns and rows.
 */
export function saveFarm(db: DatabaseSync, userId: number, payload: FarmPayload, now = new Date()): FarmRecord {
  const { input } = payload;
  const stamp = now.toISOString();
  db.exec('BEGIN');
  try {
    const existing = db.prepare('SELECT id, created_at FROM farms WHERE user_id = ?').get(userId) as { id: number; created_at: string } | undefined;
    const fields = [payload.name, payload.placeLabel ?? null, input.location.latitude, input.location.longitude, input.plantingMonth, input.irrigation, input.fieldBoundary ? JSON.stringify(input.fieldBoundary) : null, input.soilObservation ? JSON.stringify(input.soilObservation) : null, JSON.stringify(input)] as const;
    let farmId: number;
    let createdAt = stamp;
    if (existing) {
      farmId = existing.id; createdAt = existing.created_at;
      db.prepare('UPDATE farms SET name = ?, place_label = ?, latitude = ?, longitude = ?, planting_month = ?, irrigation = ?, polygon_json = ?, soil_observation_json = ?, input_json = ?, updated_at = ? WHERE id = ?').run(...fields, stamp, farmId);
      db.prepare('DELETE FROM crop_events WHERE farm_id = ?').run(farmId);
    } else {
      farmId = Number(db.prepare('INSERT INTO farms (user_id, name, place_label, latitude, longitude, planting_month, irrigation, polygon_json, soil_observation_json, input_json, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(userId, ...fields, stamp, stamp).lastInsertRowid);
    }
    const insertEvent = db.prepare('INSERT INTO crop_events (farm_id, position, crop_id, other_label, start_ym, end_ym) VALUES (?, ?, ?, ?, ?, ?)');
    input.history.forEach((event, position) => insertEvent.run(farmId, position, event.cropId ?? null, event.otherLabel ?? null, event.startYearMonth, event.endYearMonth));
    db.exec('COMMIT');
    return { id: farmId, name: payload.name, placeLabel: payload.placeLabel ?? null, input, createdAt, updatedAt: stamp };
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

/** The user's farm, or null. The stored input is validated again on the way out, so a hand-edited row cannot reach the app unchecked. */
export function getFarm(db: DatabaseSync, userId: number): FarmRecord | null {
  const row = db.prepare('SELECT id, name, place_label, input_json, created_at, updated_at FROM farms WHERE user_id = ?').get(userId) as FarmRow | undefined;
  if (!row) return null;
  const parsed = analysisInputSchema.safeParse(JSON.parse(row.input_json));
  if (!parsed.success) return null;
  return { id: row.id, name: row.name, placeLabel: row.place_label, input: parsed.data, createdAt: row.created_at, updatedAt: row.updated_at };
}
