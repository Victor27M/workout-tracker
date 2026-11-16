// Default program. Only used to fill an empty database on first launch — after that
// everything (names, sets, reps, notes) is edited in the app and lives on the phone.

export const DAYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export type DayId = (typeof DAYS)[number];
export type Unit = 'reps' | 'sec' | 'm' | 'min';

export interface Day { id: DayId; title: string; notes: string }
export interface Exercise {
  id: string;
  day: DayId;
  order: number;
  name: string;
  sets: number;
  min: number; // target range per set
  max: number;
  unit: Unit;
  load: boolean; // show a kg field
  side?: boolean; // per leg / per side
  group?: string; // superset label: exercises with the same label on a day are done back to back
  optional?: boolean;
  note?: string;
  archived?: boolean; // removed from the plan, history kept
}

type Opts = Partial<Pick<Exercise, 'unit' | 'load' | 'side' | 'group' | 'optional' | 'note'>>;
type Row = [name: string, sets: number, min: number, max: number, opts?: Opts];

const WARMUP = 'Warm-up: 5 min bike/rower\nMcGill Big 3: curl-up 3×8s, side plank 2×10s/side, bird dog 4/side (8s hold)';

const SEED: Record<DayId, [title: string, notes: string, rows: Row[]]> = {
  mon: ['Lower A', `Strength + ACL\n${WARMUP}`, [
    ['Bulgarian split squat', 4, 6, 8, { side: true, note: 'ACL leg first' }],
    ['Goblet squat', 3, 8, 10, { note: 'Full depth' }],
    ['Step-ups', 3, 8, 8, { side: true, note: 'Knee-height box' }],
    ['Lying ham curl', 4, 6, 10, { group: 'A', note: '3s down' }],
    ['Leg extension', 3, 10, 12, { group: 'A' }],
    ['Standing calf raise', 4, 8, 12, { group: 'B', note: '2s pause' }],
    ['Tibialis raise', 2, 15, 20, { group: 'B' }],
    ['Hanging knee raises', 3, 10, 15, { load: false }],
    ['45° back extension', 2, 12, 12, { optional: true }],
  ]],
  tue: ['Upper A', 'Strength', [
    ['Bench press', 3, 5, 6],
    ['Lat pulldown', 4, 6, 8, { note: 'Heavy' }],
    ['Military press', 3, 6, 8, { note: 'No leaning back' }],
    ['Chest-supported row', 4, 8, 8],
    ['Dips', 3, 8, 10, { optional: true, note: '2–3 sets' }],
    ['Seated calf raise', 2, 12, 15, { group: 'A' }],
    ['Cable crunch', 3, 12, 15, { group: 'A' }],
  ]],
  wed: ['Cardio / Rehab', 'Tired or exam week → full rest', [
    ['Zone 2 – StairMaster or rower', 1, 30, 40, { unit: 'min', load: false }],
    ['Calf raise, straight knee', 3, 15, 15, { note: '3s up / 3s down' }],
    ['Calf raise, bent knee', 3, 15, 15, { note: '3s up / 3s down' }],
    ['Tibialis raise', 3, 15, 20, { note: '3s up / 3s down' }],
  ]],
  thu: ['Upper B', 'Hypertrophy', [
    ['Incline DB press', 3, 8, 12],
    ['Neutral-grip pulldown / assisted pull-ups', 3, 10, 12],
    ['Single-arm DB row', 3, 10, 12, { side: true }],
    ['Machine chest press / push-ups', 3, 10, 12],
    ['Seated cable row', 3, 12, 12],
    ['Farmers carry', 3, 30, 40, { unit: 'm', note: '>24 kg/hand' }],
    ['Standing calf raise', 2, 10, 12, { group: 'A' }],
    ['Pallof press', 3, 10, 10, { group: 'A', side: true }],
  ]],
  fri: ['Lower B', `Volume + control\n${WARMUP}`, [
    ['Landing practice', 3, 5, 5, { load: false, note: '2–3 sets · snap-downs if shins hurt' }],
    ['Nordic curls, assisted', 3, 5, 6, { load: false, note: '2 sets first weeks' }],
    ['Bulgarian split squat', 3, 10, 12, { side: true, note: 'Lighter' }],
    ['Lateral step-downs', 3, 10, 10, { side: true, note: 'Slow' }],
    ['Seated ham curl', 4, 10, 15, { group: 'A' }],
    ['Leg extension', 3, 12, 15, { group: 'A' }],
    ['Hip abductor', 3, 15, 15, { group: 'B' }],
    ['Hip adductor', 3, 15, 15, { group: 'B' }],
    ['Seated calf raise', 4, 12, 15, { group: 'C' }],
    ['Tibialis raise', 2, 15, 20, { group: 'C' }],
    ['Dead bugs', 3, 8, 8, { side: true, load: false }],
  ]],
  sat: ['Arms, delts, calves', 'Plus sauna · 40–50 min', [
    ['Triceps pushdown', 3, 10, 12],
    ['Biceps curl', 3, 8, 12],
    ['Lateral raises', 3, 12, 15],
    ['Overhead triceps extension', 3, 10, 12],
    ['Preacher curl', 3, 10, 12],
    ['Archer pulls', 3, 12, 15, { note: 'Rear delts' }],
    ['Single-leg calf raise', 3, 10, 15, { side: true }],
    ['Plank', 2, 45, 60, { unit: 'sec', load: false }],
    ['Side plank', 2, 30, 45, { unit: 'sec', load: false, side: true }],
    ['Sauna', 3, 10, 15, { unit: 'min', load: false, note: '2–3 rounds · +0.5–1 L water' }],
  ]],
  sun: ['Rest', '', []],
};

export const RULES = `BULK TO HYROX (Nov–Jan)
Daily: 10k steps · After lifting: 10–15 min easy cardio
Double progression: top of range with 2 RIR → add load
ACL leg sets weight/reps for single-leg work
24h rule: knee/back/shins worse next day → repeat load
Nov: ~70% of old loads, 2–3 RIR
Shin pain: ≤3/10 during, gone by next morning
No running until 25 single-leg calf raises/leg pain-free`;

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const seedDays: Day[] = DAYS.map((id) => ({ id, title: SEED[id][0], notes: SEED[id][1] }));
export const seedExercises: Exercise[] = DAYS.flatMap((day) =>
  SEED[day][2].map(([name, sets, min, max, o = {}], order) => ({
    id: `${day}-${slug(name)}`, day, order, name, sets, min, max, unit: 'reps' as Unit, load: true, ...o,
  })),
);
