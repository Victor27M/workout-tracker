// Pure helpers (no DOM / DB) so they can be checked with `npm run check`.
import { DAYS, type DayId } from './plan.ts';

export interface SetLog { id: string; date: string; exId: string; i: number; w?: number; r?: number; updatedAt: number }

const pad = (n: number) => String(n).padStart(2, '0');
/** Local-date key YYYY-MM-DD (never toISOString: that's UTC and gives yesterday after midnight in Romania). */
export const dateKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const addDays = (k: string, n: number) => { const d = fromKey(k); d.setDate(d.getDate() + n); return dateKey(d); };
/** getDay() starts on Sunday; the plan starts on Monday. */
export const weekday = (k: string): DayId => DAYS[(fromKey(k).getDay() + 6) % 7];
export const weekOf = (k: string) => { const mon = addDays(k, -DAYS.indexOf(weekday(k))); return DAYS.map((_, i) => addDays(mon, i)); };

/** "#2026-11-16" → that date; "#mon" (calendar links) → that weekday in the current week. */
export function resolveHash(hash: string, today: string): string | null {
  const h = hash.replace(/^#\/?/, '').toLowerCase();
  if (/^\d{4}-\d{2}-\d{2}$/.test(h)) return h;
  const i = DAYS.indexOf(h as DayId);
  return i < 0 ? null : weekOf(today)[i];
}

/** Accepts "22,5" (iOS decimal keyboard in RO locale) as well as "22.5". */
export const parseNum = (s: string) => { const n = parseFloat(s.replace(',', '.')); return Number.isFinite(n) ? n : undefined; };

/** Sets of the most recent session for exId strictly before `date`, ordered by set index. */
export function lastSession(logs: SetLog[], exId: string, date: string) {
  let best = '';
  for (const l of logs) if (l.exId === exId && l.date < date && l.date > best) best = l.date;
  return { date: best, sets: logs.filter((l) => l.exId === exId && l.date === best).sort((a, b) => a.i - b.i) };
}

/** Double progression: every planned set reached the top of the range last time. */
export const readyToAdd = (sets: SetLog[], planned: number, max: number) =>
  sets.length >= planned && sets.slice(0, planned).every((s) => (s.r ?? 0) >= max);

/** One point per session: heaviest set and total reps/units. */
export function sessions(logs: SetLog[], exId: string) {
  const by = new Map<string, SetLog[]>();
  for (const l of logs) if (l.exId === exId) by.set(l.date, [...(by.get(l.date) ?? []), l]);
  return [...by.entries()].sort(([a], [b]) => (a < b ? -1 : 1)).map(([date, s]) => ({
    date,
    sets: s.sort((a, b) => a.i - b.i),
    top: Math.max(0, ...s.map((x) => x.w ?? 0)),
    total: s.reduce((t, x) => t + (x.r ?? 0), 0),
  }));
}
