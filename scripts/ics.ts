// Writes public/calendar.ics: one weekly all-day event per training day, linking to that day in the app.
import { writeFileSync } from 'node:fs';
import { DAYS, seedDays, seedExercises } from '../src/plan.ts';

const SITE = 'https://victor27m.github.io/workout-tracker/';
const START = new Date(2026, 10, 16); // Monday of the first week
const ymd = (d: Date) => `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
// RFC 5545: lines over 75 octets are folded (CRLF + space). Cut on characters, counting UTF-8 bytes.
const fold = (line: string) => {
  const out: string[] = []; let cur = '';
  for (const ch of line) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ''; }
    cur += ch;
  }
  return [...out, cur].join('\r\n ');
};

const events = seedDays.filter((d) => d.id !== 'sun').map((d) => {
  const day = new Date(START); day.setDate(day.getDate() + DAYS.indexOf(d.id));
  const url = `${SITE}#${d.id}`;
  const list = seedExercises.filter((e) => e.day === d.id).map((e) => `• ${e.name}`).join('\n');
  return ['BEGIN:VEVENT', `UID:workout-${d.id}@victor27m.github.io`, 'DTSTAMP:20261116T000000Z',
    `DTSTART;VALUE=DATE:${ymd(day)}`, 'RRULE:FREQ=WEEKLY', `SUMMARY:${esc(d.title)}`, `URL:${url}`,
    `DESCRIPTION:${esc(`Open workout: ${url}\n\n${list}`)}`, 'TRANSP:TRANSPARENT', 'END:VEVENT'];
});

const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//workout-tracker//EN', 'CALSCALE:GREGORIAN',
  'X-WR-CALNAME:Training', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', ...events.flat(), 'END:VCALENDAR'];
writeFileSync(new URL('../public/calendar.ics', import.meta.url), lines.map(fold).join('\r\n') + '\r\n');
console.log(`calendar.ics: ${events.length} weekly events`);
