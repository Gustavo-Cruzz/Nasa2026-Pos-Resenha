import { describe, expect, it } from 'vitest';
import raw from '@/data/plantae_ciclos_17_culturas_v2.2.json';
import { cycleSimulationDataset, cycleSimulationSchema, resolveCycleSimulation } from '@/lib/cycle-simulation';
import { analyze } from '@/lib/engine';
import { changeLabSlot, createLabPlan, labPlanSchema } from '@/lib/lab';
import { demoScenarios } from '@/lib/demo-scenarios';
import { slotWindow } from '@/lib/engine/slot-window';
import { cropById } from '@/lib/catalog';

describe('cycle simulation 2.2', () => {
  it('persists slot confirmation, uses the range in occupancy and resets it on crop change', () => {
    const input = demoScenarios[0].input;
    const plan = createLabPlan(input, ['watermelon', 'watermelon', 'watermelon']);
    for (const scenario of plan.scenarios) for (const slot of scenario.slots) { slot.cropId = 'watermelon'; slot.cycleContextConfirmed = true; }
    const confirmed = analyze(input, undefined, labPlanSchema.parse(plan));
    expect(confirmed.strategies[0].slots[0].window?.months).toHaveLength(4);
    expect(confirmed.strategies[0].slots[0].window?.simulation?.daysRange).toEqual({ min: 95, max: 110 });
    expect(confirmed.strategies[0].bareSoil?.windowsSource).not.toBe('unknown');
    const changed = changeLabSlot(plan, 'A', 0, 'carrot');
    expect(changed.scenarios[0].slots[0].cycleContextConfirmed).toBe(false);
    const unconfirmed = analyze(input, undefined, changed).strategies.find((item) => item.id === 'A')!;
    expect(unconfirmed.slots[0].window).toBeNull();
    expect(unconfirmed.bareSoil?.bareMonths).toEqual([]);
    expect(unconfirmed.bareSoil?.windowsSource).toBe('unknown');
    const revoked = changeLabSlot(plan, 'A', 0, 'watermelon');
    expect(confirmed.strategies[0].slots[0].zarc).toEqual(analyze(input, undefined, revoked).strategies.find((item) => item.id === 'A')?.slots[0].zarc);
  });
  it('keeps perennial windows occupied for the horizon without inferring a terminal cycle', () => {
    const window = slotWindow(cropById.get('coffee'), 1, 'A', true)!;
    expect(window.months).toHaveLength(24);
    expect(window.cycleDays).toBeNull();
    expect(window.simulation?.endEvent).toBeNull();
  });
  it('preserves the entire supplied dataset', () => expect(cycleSimulationDataset).toEqual(raw));
  it('requires confirmation and blocks other uses', () => {
    expect(resolveCycleSimulation('peanut', false)).toBeNull();
    expect(resolveCycleSimulation('peanut', true, 'zarc')).toBeNull();
    expect(resolveCycleSimulation('peanut', true, 'recommendation')).toBeNull();
    expect(resolveCycleSimulation('peanut', true)).toMatchObject({ estimated: true, daysRange: { min: 95, max: 105 } });
  });
  it('preserves perennial occupancy and never turns unknown days into zero', () => {
    for (const id of ['coffee', 'banana', 'cacao', 'acai']) expect(resolveCycleSimulation(id, true)).toMatchObject({ daysRange: null, horizonMonths: 24 });
    expect(resolveCycleSimulation('unknown', true)).toBeNull();
  });
  it('rejects invalid ranges and duplicate IDs', () => {
    const invalid = structuredClone(raw); invalid.records[0].simulationDaysRange = { min: 120, max: 90 };
    expect(cycleSimulationSchema.safeParse(invalid).success).toBe(false);
    const duplicate = structuredClone(raw); duplicate.records[1].cropId = duplicate.records[0].cropId;
    expect(cycleSimulationSchema.safeParse(duplicate).success).toBe(false);
  });
});
