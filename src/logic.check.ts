import assert from 'node:assert/strict';
import { addDays, dateKey, lastSession, parseNum, readyToAdd, resolveHash, sessions, weekOf, weekday, type SetLog } from './logic.ts';

assert.equal(dateKey(new Date(2026, 10, 16, 0, 30)), '2026-11-16'); // just after local midnight
assert.equal(weekday('2026-11-16'), 'mon');
assert.equal(weekday('2026-11-22'), 'sun');
assert.deepEqual(weekOf('2026-11-22')[0], '2026-11-16'); // Sunday belongs to the week starting Monday
assert.equal(addDays('2026-12-31', 1), '2027-01-01');
assert.equal(resolveHash('#fri', '2026-11-18'), '2026-11-20');
assert.equal(resolveHash('#mon', '2026-11-22'), '2026-11-16');
assert.equal(resolveHash('#2026-12-01', '2026-11-18'), '2026-12-01');
assert.equal(resolveHash('#nope', '2026-11-18'), null);
assert.equal(parseNum('22,5'), 22.5);
assert.equal(parseNum(''), undefined);

const L = (date: string, i: number, w: number, r: number): SetLog => ({ id: `${date}|x|${i}`, date, exId: 'x', i, w, r, updatedAt: 0 });
const logs = [L('2026-11-09', 0, 40, 8), L('2026-11-09', 1, 40, 8), L('2026-11-02', 0, 35, 8), L('2026-11-16', 0, 42.5, 6)];
const last = lastSession(logs, 'x', '2026-11-16');
assert.equal(last.date, '2026-11-09');
assert.deepEqual(last.sets.map((s) => s.w), [40, 40]);
assert.equal(lastSession(logs, 'x', '2026-11-02').sets.length, 0);
assert.ok(readyToAdd(last.sets, 2, 8));
assert.ok(!readyToAdd(last.sets, 3, 8)); // a planned set is missing
assert.deepEqual(sessions(logs, 'x').map((s) => [s.date, s.top, s.total]), [['2026-11-02', 35, 8], ['2026-11-09', 40, 16], ['2026-11-16', 42.5, 6]]);
console.log('logic ok');
