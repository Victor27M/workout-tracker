import Dexie, { type Table } from 'dexie';
import type { SetLog } from './logic.ts';
import { RULES, seedDays, seedExercises, type Day, type Exercise } from './plan.ts';

class DB extends Dexie {
  days!: Table<Day, string>;
  exercises!: Table<Exercise, string>;
  sets!: Table<SetLog, string>;
  meta!: Table<{ key: string; value: string }, string>;
  constructor() {
    super('workout-tracker');
    this.version(1).stores({ days: 'id', exercises: 'id, day', sets: 'id, exId, date', meta: 'key' });
    // Runs only when the database is first created, so later deploys never overwrite edits.
    this.on('populate', async (tx) => {
      await tx.table('days').bulkAdd(seedDays);
      await tx.table('exercises').bulkAdd(seedExercises);
      await tx.table('meta').add({ key: 'rules', value: RULES });
    });
  }
}

export const db = new DB();
navigator.storage?.persist?.().catch(() => {}); // ask the browser not to evict our data

/** Patch one field ({w} or {r}) of a set; reads the current row inside the transaction so fast typing can't clobber the other field. */
export function saveSet(date: string, exId: string, i: number, patch: { w?: number } | { r?: number }) {
  const id = `${date}|${exId}|${i}`;
  return db.transaction('rw', db.sets, async () => {
    const next = { ...(await db.sets.get(id)), ...patch };
    if (next.w === undefined && next.r === undefined) await db.sets.delete(id);
    else await db.sets.put({ ...next, id, date, exId, i, updatedAt: Date.now() });
  });
}

/** How many set rows an exercise shows on a given date (defaults to the plan). */
const countKey = (date: string, exId: string) => `n|${date}|${exId}`;
export const setCount = (date: string, exId: string, n: number) => db.meta.put({ key: countKey(date, exId), value: String(n) });
export const dayCounts = async (date: string) =>
  new Map((await db.meta.where('key').startsWith(`n|${date}|`).toArray()).map((m) => [m.key.split('|')[2], Number(m.value)]));

/** Delete set i and move the later sets up one, so numbering stays 1..n. */
export function removeSet(date: string, exId: string, i: number, rows: number) {
  return db.transaction('rw', db.sets, db.meta, async () => {
    const later = (await db.sets.where('exId').equals(exId).toArray()).filter((s) => s.date === date && s.i >= i);
    await db.sets.bulkDelete(later.map((s) => s.id));
    await db.sets.bulkPut(later.filter((s) => s.i > i).map((s) => ({ ...s, i: s.i - 1, id: `${date}|${exId}|${s.i - 1}` })));
    await setCount(date, exId, Math.max(0, rows - 1));
  });
}

const APP = 'workout-tracker';
export async function exportBackup() {
  const tables: Record<string, unknown[]> = {};
  for (const t of db.tables) tables[t.name] = await t.toArray();
  return { app: APP, version: 1, exportedAt: new Date().toISOString(), tables };
}

export async function importBackup(b: { app?: string; version?: number; tables?: Record<string, unknown[]> }) {
  if (b?.app !== APP || b.version !== 1 || typeof b.tables !== 'object') throw new Error('Not a workout tracker backup file');
  const tables = b.tables;
  await db.transaction('rw', db.tables, async () => {
    for (const t of db.tables) { await t.clear(); await t.bulkAdd(tables[t.name] ?? []); }
  });
}
