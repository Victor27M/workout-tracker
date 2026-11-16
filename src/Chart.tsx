import { useState } from 'react';
import { fromKey } from './logic.ts';

const W = 320, H = 130, L = 34, R = 12, T = 14, B = 22;
export const fmtDate = (k: string) => fromKey(k).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });

/** One series over time: line + dots, tap/drag to read a point. */
export function Chart({ title, unit, points }: { title: string; unit: string; points: { date: string; v: number }[] }) {
  const [sel, setSel] = useState<number | null>(null);
  if (points.length === 0) return null;
  const t = points.map((p) => fromKey(p.date).getTime());
  const t0 = t[0], t1 = Math.max(t[t.length - 1], t0 + 864e5);
  const vs = points.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (lo === hi) { lo -= 1; hi += 1; }
  const pad = (hi - lo) * 0.1; lo = Math.max(0, Math.floor(lo - pad)); hi = Math.ceil(hi + pad);
  const x = (i: number) => points.length === 1 ? (L + W - R) / 2 : L + ((t[i] - t0) / (t1 - t0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const fmt = (v: number) => String(Math.round(v * 10) / 10);
  const shown = Math.min(sel ?? points.length - 1, points.length - 1);

  const pick = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    let best = 0;
    points.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(best) - px)) best = i; });
    setSel(best);
  };

  return (
    <figure className="chart">
      <figcaption>
        <span>{title}</span>
        <span className="muted">{fmtDate(points[shown].date)} · <b>{fmt(points[shown].v)}</b> {unit}</span>
      </figcaption>
      <svg viewBox={`0 0 ${W} ${H}`} onPointerDown={pick} onPointerMove={(e) => e.buttons && pick(e)} role="img"
        aria-label={`${title}: ${points.map((p) => `${fmtDate(p.date)} ${fmt(p.v)} ${unit}`).join(', ')}`}>
        {[lo, hi].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} className="grid" />
            <text x={L - 6} y={y(v) + 4} textAnchor="end" className="tick">{fmt(v)}</text>
          </g>
        ))}
        <text x={L} y={H - 6} className="tick">{fmtDate(points[0].date)}</text>
        {points.length > 1 && <text x={W - R} y={H - 6} textAnchor="end" className="tick">{fmtDate(points[points.length - 1].date)}</text>}
        <line x1={x(shown)} x2={x(shown)} y1={T} y2={H - B} className="cross" />
        <polyline points={points.map((p, i) => `${x(i)},${y(p.v)}`).join(' ')} className="line" />
        {points.map((p, i) => <circle key={p.date} cx={x(i)} cy={y(p.v)} r={i === shown ? 5 : 4} className={i === shown ? 'dot on' : 'dot'} />)}
      </svg>
    </figure>
  );
}
