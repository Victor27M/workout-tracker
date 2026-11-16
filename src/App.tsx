import { useLiveQuery } from 'dexie-react-hooks';
import { useEffect, useState } from 'react';
import { Chart, fmtDate } from './Chart.tsx';
import { db, exportBackup, importBackup, saveSet } from './db.ts';
import { addDays, dateKey, fromKey, lastSession, parseNum, readyToAdd, resolveHash, sessions, weekOf, weekday, type SetLog } from './logic.ts';
import type { Exercise, Unit } from './plan.ts';

const UNIT: Record<Unit, string> = { reps: 'reps', sec: 's', m: 'm', min: 'min' };
const range = (e: Exercise) => (e.min === e.max ? `${e.min}` : `${e.min}–${e.max}`);
const target = (e: Exercise) => `${e.sets} × ${range(e)} ${UNIT[e.unit]}${e.side ? ' / side' : ''}`;
const fmtSet = (s: SetLog, u: Unit) => [s.w !== undefined ? `${s.w} kg` : '', s.r !== undefined ? `${s.r}${u === 'reps' ? '' : ' ' + UNIT[u]}` : ''].filter(Boolean).join(' × ');

type View = { k: 'day' } | { k: 'ex'; id: string } | { k: 'settings' };

export default function App() {
  const [today, setToday] = useState(() => dateKey(new Date()));
  const [date, setDate] = useState(() => resolveHash(location.hash, today) ?? today);
  const [view, setView] = useState<View>({ k: 'day' });

  // Follow the calendar: when the app comes back on a new day, move along if you were on "today".
  useEffect(() => {
    const tick = () => {
      const now = dateKey(new Date());
      setToday((old) => { if (old !== now) setDate((d) => (d === old ? now : d)); return now; });
    };
    const id = setInterval(tick, 60_000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);

  // Calendar links (#mon … #sat, or #YYYY-MM-DD) open that day.
  useEffect(() => {
    const go = () => {
      const d = resolveHash(location.hash, dateKey(new Date()));
      if (d) { setDate(d); setView({ k: 'day' }); }
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
    };
    go();
    addEventListener('hashchange', go);
    return () => removeEventListener('hashchange', go);
  }, []);

  if (view.k === 'ex') return <ExerciseDetail id={view.id} back={() => setView({ k: 'day' })} />;
  if (view.k === 'settings') return <Settings back={() => setView({ k: 'day' })} />;
  return <DayView date={date} today={today} setDate={setDate} open={(id) => setView({ k: 'ex', id })} settings={() => setView({ k: 'settings' })} />;
}

function DayView({ date, today, setDate, open, settings }: {
  date: string; today: string; setDate: (d: string) => void; open: (id: string) => void; settings: () => void;
}) {
  const [edit, setEdit] = useState(false);
  const dayId = weekday(date);
  const day = useLiveQuery(() => db.days.get(dayId), [dayId]);
  const loaded = useLiveQuery(() => db.exercises.where('day').equals(dayId).sortBy('order'), [dayId]);
  const exercises = loaded ?? [];
  const logs = useLiveQuery(() => db.sets.toArray(), []) ?? [];
  const active = exercises.filter((e) => !e.archived);

  return (
    <main>
      <nav className="week">
        <button aria-label="Previous week" onClick={() => setDate(addDays(date, -7))}>‹</button>
        {weekOf(date).map((d) => (
          <button key={d} className={`wd${d === date ? ' sel' : ''}${d === today ? ' today' : ''}`} onClick={() => setDate(d)}>
            <small>{fromKey(d).toLocaleDateString('en-GB', { weekday: 'narrow' })}</small>
            {fromKey(d).getDate()}
          </button>
        ))}
        <button aria-label="Next week" onClick={() => setDate(addDays(date, 7))}>›</button>
      </nav>

      <header className="head">
        <div>
          <div className="muted small">
            {fromKey(date).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}
            {date !== today && <> · <button className="link" onClick={() => setDate(today)}>Today</button></>}
          </div>
          {edit
            ? <input className="title-in" defaultValue={day?.title} key={dayId} onChange={(e) => db.days.update(dayId, { title: e.target.value })} />
            : <h1>{day?.title}</h1>}
        </div>
        <div className="actions">
          <button className="btn" onClick={() => setEdit(!edit)}>{edit ? 'Done' : 'Edit'}</button>
          {!edit && <button className="btn" onClick={settings} aria-label="Settings">•••</button>}
        </div>
      </header>

      {edit
        ? <textarea className="notes-in" rows={4} defaultValue={day?.notes} key={dayId + 'n'} placeholder="Notes (warm-up, reminders…)"
            onChange={(e) => db.days.update(dayId, { notes: e.target.value })} />
        : day?.notes && <p className="notes">{day.notes}</p>}

      {loaded && active.length === 0 && !edit && <p className="muted empty">{dayId === 'sun' ? 'Rest day.' : 'Nothing planned. Tap Edit to add exercises.'}</p>}

      {active.map((e, idx) => edit
        ? <ExerciseEdit key={e.id} e={e} prev={active[idx - 1]} next={active[idx + 1]} />
        : <ExerciseLog key={e.id + date} e={e} date={date} logs={logs} open={() => open(e.id)} />)}

      {edit && (
        <button className="btn wide" onClick={() => db.exercises.add({
          id: crypto.randomUUID?.() ?? String(Date.now()), day: dayId, order: (exercises.at(-1)?.order ?? -1) + 1,
          name: 'New exercise', sets: 3, min: 8, max: 12, unit: 'reps', load: true,
        })}>+ Add exercise</button>
      )}
    </main>
  );
}

function ExerciseLog({ e, date, logs, open }: { e: Exercise; date: string; logs: SetLog[]; open: () => void }) {
  const mine = logs.filter((l) => l.exId === e.id && l.date === date);
  const last = lastSession(logs, e.id, date);
  const extra = Math.max(0, ...mine.map((l) => l.i + 1)) - e.sets; // sets logged beyond the plan
  const [added, setAdded] = useState(0);
  const rows = e.sets + Math.max(extra, added);
  const done = mine.filter((l) => l.r !== undefined).length;

  return (
    <section className={`card${e.group ? ' ss' : ''}`}>
      <button className="card-head" onClick={open}>
        <span className="name">{e.name}{e.optional && <span className="muted"> · optional</span>}</span>
        <span className="muted small">{done}/{e.sets} ›</span>
      </button>
      <div className="muted small">
        {e.group && <span className="tag">SS {e.group}</span>}{target(e)}{e.note && ` · ${e.note}`}
      </div>
      {last.date && readyToAdd(last.sets, e.sets, e.max) && <div className="up">↑ Top of range last time. Add load if it felt like 2 RIR.</div>}
      <div className="sets">
        {Array.from({ length: rows }, (_, i) => {
          const cur = mine.find((l) => l.i === i);
          const prev = last.sets.find((l) => l.i === i) ?? last.sets.at(-1);
          return (
            <div className="set" key={i}>
              <span className="n">{i + 1}</span>
              {e.load && <Num value={cur?.w} ph={prev?.w} label="kg" onSave={(w) => saveSet(date, e.id, i, w, cur?.r)} />}
              {e.load && <span className="x">×</span>}
              <Num value={cur?.r} ph={prev?.r} label={UNIT[e.unit]} onSave={(r) => saveSet(date, e.id, i, cur?.w, r)} />
            </div>
          );
        })}
      </div>
      <div className="foot small muted">
        <span>{last.date ? `Last ${fmtDate(last.date)}: ${last.sets.map((s) => fmtSet(s, e.unit)).join(', ')}` : 'No history yet'}</span>
        <button className="link" onClick={() => setAdded(Math.max(extra, added) + 1)}>+ set</button>
      </div>
    </section>
  );
}

/** Uncontrolled so half-typed values like "22," survive; saves on every keystroke. */
function Num({ value, ph, label, onSave }: { value?: number; ph?: number; label: string; onSave: (v?: number) => void }) {
  return (
    <label className="num">
      <input inputMode="decimal" defaultValue={value ?? ''} placeholder={ph !== undefined ? String(ph) : '–'}
        onChange={(ev) => onSave(parseNum(ev.target.value))} onFocus={(ev) => ev.target.select()} />
      <span>{label}</span>
    </label>
  );
}

function ExerciseEdit({ e, prev, next }: { e: Exercise; prev?: Exercise; next?: Exercise }) {
  const up = (patch: Partial<Exercise>) => db.exercises.update(e.id, patch);
  const int = (s: string) => { const n = parseInt(s, 10); return Number.isFinite(n) && n >= 0 ? n : undefined; };
  const swap = (o?: Exercise) => o && db.transaction('rw', db.exercises, () => { up({ order: o.order }); db.exercises.update(o.id, { order: e.order }); });
  return (
    <section className="card edit">
      <input className="name-in" defaultValue={e.name} onChange={(ev) => up({ name: ev.target.value })} aria-label="Name" />
      <div className="grid3">
        <label>Sets<input inputMode="numeric" defaultValue={e.sets} onChange={(ev) => { const n = int(ev.target.value); if (n) up({ sets: n }); }} /></label>
        <label>Min<input inputMode="numeric" defaultValue={e.min} onChange={(ev) => { const n = int(ev.target.value); if (n !== undefined) up({ min: n }); }} /></label>
        <label>Max<input inputMode="numeric" defaultValue={e.max} onChange={(ev) => { const n = int(ev.target.value); if (n !== undefined) up({ max: n }); }} /></label>
        <label>Unit
          <select defaultValue={e.unit} onChange={(ev) => up({ unit: ev.target.value as Unit })}>
            <option value="reps">reps</option><option value="sec">seconds</option><option value="m">metres</option><option value="min">minutes</option>
          </select>
        </label>
        <label>Superset<input defaultValue={e.group ?? ''} placeholder="A, B…" onChange={(ev) => up({ group: ev.target.value.trim() || undefined })} /></label>
      </div>
      <input className="note-in" defaultValue={e.note ?? ''} placeholder="Note" onChange={(ev) => up({ note: ev.target.value || undefined })} />
      <div className="checks">
        <label><input type="checkbox" defaultChecked={e.load} onChange={(ev) => up({ load: ev.target.checked })} /> kg</label>
        <label><input type="checkbox" defaultChecked={e.side} onChange={(ev) => up({ side: ev.target.checked })} /> per side</label>
        <label><input type="checkbox" defaultChecked={e.optional} onChange={(ev) => up({ optional: ev.target.checked })} /> optional</label>
      </div>
      <div className="row-btns">
        <button className="btn" disabled={!prev} onClick={() => swap(prev)}>↑</button>
        <button className="btn" disabled={!next} onClick={() => swap(next)}>↓</button>
        <button className="btn" onClick={() => confirm(`Remove "${e.name}" from the plan? Logged history is kept.`) && up({ archived: true })}>Remove</button>
      </div>
    </section>
  );
}

function ExerciseDetail({ id, back }: { id: string; back: () => void }) {
  const e = useLiveQuery(() => db.exercises.get(id), [id]);
  const logs = useLiveQuery(() => db.sets.where('exId').equals(id).toArray(), [id]) ?? [];
  if (!e) return null;
  const s = sessions(logs, id);
  const best = Math.max(0, ...s.map((x) => x.top));
  return (
    <main>
      <button className="link back" onClick={back}>‹ Back</button>
      <h1>{e.name}</h1>
      <p className="muted small">{target(e)}{e.note && ` · ${e.note}`}</p>
      {s.length === 0 && <p className="muted empty">No sessions logged yet.</p>}
      {e.load && best > 0 && <>
        <div className="stat"><span className="muted small">Best set</span><b>{best} kg</b></div>
        <Chart title="Heaviest set" unit="kg" points={s.filter((x) => x.top > 0).map((x) => ({ date: x.date, v: x.top }))} />
      </>}
      {s.length > 0 && <Chart title={`Total ${UNIT[e.unit]}`} unit={UNIT[e.unit]} points={s.map((x) => ({ date: x.date, v: x.total }))} />}
      {s.length > 0 && <h2 className="label">History</h2>}
      <ul className="hist">
        {[...s].reverse().map((x) => (
          <li key={x.date}><span className="muted">{fmtDate(x.date)}</span><span>{x.sets.map((y) => fmtSet(y, e.unit)).join(' · ')}</span></li>
        ))}
      </ul>
    </main>
  );
}

function Settings({ back }: { back: () => void }) {
  const rules = useLiveQuery(() => db.meta.get('rules'));
  const [msg, setMsg] = useState('');
  const ics = `${location.host}${import.meta.env.BASE_URL}calendar.ics`;

  const doExport = async () => {
    const file = new File([JSON.stringify(await exportBackup())], `workouts-${dateKey(new Date())}.json`, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file] }).catch(() => {});
    else { const a = document.createElement('a'); a.href = URL.createObjectURL(file); a.download = file.name; a.click(); }
  };
  const doImport = async (f?: File) => {
    if (!f || !confirm('Replace all data on this device with the backup?')) return;
    try { await importBackup(JSON.parse(await f.text())); setMsg('Backup restored.'); } catch (err) { setMsg(String((err as Error).message)); }
  };

  return (
    <main>
      <button className="link back" onClick={back}>‹ Back</button>
      <h1>Settings</h1>

      <h2 className="label">Rules</h2>
      {rules && <textarea className="notes-in" rows={12} defaultValue={rules.value} onChange={(ev) => db.meta.put({ key: 'rules', value: ev.target.value })} />}

      <h2 className="label">Calendar</h2>
      <p className="small">Adds each training day (Mon–Sat, repeating weekly) to your iPhone Calendar. Each event links back to that day's workout.</p>
      <a className="btn wide" href={`webcal://${ics}`}>Subscribe in Calendar</a>
      <p className="hint">The events come from the default plan. Renaming days in the app doesn't change them. On iPhone, Calendar links open in Safari, so use the app from a Safari tab or bookmark if you want links and data in one place: the Home Screen app keeps its own separate data.</p>

      <h2 className="label">Backup</h2>
      <p className="small">Your data is stored only on this device. Export a backup now and then (Files / iCloud Drive).</p>
      <div className="row-btns">
        <button className="btn" onClick={doExport}>Export</button>
        <label className="btn">Import<input type="file" accept="application/json,.json" hidden onChange={(ev) => doImport(ev.target.files?.[0])} /></label>
      </div>
      {msg && <p className="hint">{msg}</p>}
    </main>
  );
}
