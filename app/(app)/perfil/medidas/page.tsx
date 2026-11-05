import Link from 'next/link';
import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { corta, today } from '@/lib/dates';
import { FORM_KEYS, METRICS, PAIRS, SINGLES, fmt, meta, type Measure, type MetricKey } from '@/lib/measures';
import { deleteMeasure, saveMeasure } from './actions';

export const dynamic = 'force-dynamic';

const ERR: Record<string, string> = {
  fecha: 'Elegí una fecha de hoy o anterior.',
  vacio: 'Cargá al menos una medida.',
};

export default async function Medidas({ searchParams }: { searchParams: { ok?: string; error?: string; fecha?: string } }) {
  const u = await requireUser();
  const rows = await q<Measure>(
    `select id, to_char(date,'YYYY-MM-DD') as date, note, ${METRICS.map((m) => `${m.k}::float as ${m.k}`).join(', ')}
       from body_measurements where user_id = $1 order by date`,
    [u.id]
  );
  const fecha = searchParams.fecha && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.fecha) ? searchParams.fecha : today();
  const editing = rows.find((r) => r.date === fecha);
  const last = rows[rows.length - 1];
  const used = METRICS.filter((m) => rows.some((r) => r[m.k] != null));
  const has = (k: MetricKey) => rows.some((r) => r[k] != null);
  const err = searchParams.error && (ERR[searchParams.error] ?? `Revisá “${METRICS.find((m) => m.k === searchParams.error)?.label ?? 'la medida'}”: el número no parece correcto.`);
  const dias = last ? Math.round((new Date(today()).getTime() - new Date(last.date).getTime()) / 86400000) : null;

  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Volver a Perfil" right={<span className="caption muted">Solo lo ves vos</span>} />
      <h1 className="title">Mis medidas</h1>
      <p className="caption muted">Medite una vez por semana, el mismo día y a la misma hora, así los números se pueden comparar. Lo que más muestra el progreso al quemar grasa es la cintura, aunque la balanza no se mueva.</p>
      {searchParams.ok && <p className="card bg-venda strong brand" style={{ padding: '12px 14px' }}>¡Medidas guardadas! 💪</p>}
      {dias != null && dias >= 7 && !searchParams.ok && <p className="card bg-cuerda strong" style={{ padding: '12px 14px' }}>Pasaron {dias} días desde tu última medición: toca medirte.</p>}

      <form action={saveMeasure} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 12 }}>
        <div className="row">
          <span className="label">{editing ? 'Corregir medición' : 'Nueva medición'}</span>
          <input className="input" type="date" name="date" defaultValue={fecha} max={today()} style={{ width: 'auto', height: 40 }} aria-label="Fecha" />
        </div>
        {err && <p role="alert" className="caption strong" style={{ color: 'var(--alerta)' }}>{err}</p>}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {FORM_KEYS.map((k) => {
            const m = meta(k);
            return (
              // Pecho ocupa la fila entera, así izquierda y derecha de cada par quedan una al lado de la otra
              <label key={k} className="field" style={k === 'chest' ? { gridColumn: '1 / -1' } : undefined}>
                <span>{m.label} ({m.unit})</span>
                <input className="input" name={k} inputMode="decimal" key={`${fecha}-${k}`}
                  defaultValue={editing?.[k] != null ? fmt(editing[k]!) : ''} placeholder={last?.[k] != null ? fmt(last[k]!) : '—'} />
              </label>
            );
          })}
        </div>
        <details>
          <summary className="link" style={{ fontSize: 13, cursor: 'pointer' }}>¿Cómo medir cada una?</summary>
          <ul className="caption muted" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {METRICS.filter((m) => m.hint).map((m) => <li key={m.k}><b>{m.label}:</b> {m.hint}.</li>)}
            {PAIRS.map((p) => <li key={p.label}><b>{p.label}:</b> {p.hint}.</li>)}
            <li>Con la cinta apoyada, sin apretar la piel, y sin ropa gruesa.</li>
          </ul>
        </details>
        <label><span className="sr">Nota</span><input className="input" name="note" key={`${fecha}-note`} defaultValue={editing?.note ?? ''} maxLength={300} placeholder="Nota (opcional): ej. semana con poco sueño" /></label>
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}>{editing ? 'Guardar cambios' : 'Guardar medidas'}</button>
        <span className="caption muted">Dejá vacío lo que no mediste. El placeholder gris es tu última medida.</span>
      </form>

      {used.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <h2 className="label">Tu progreso</h2>
          {SINGLES.filter(has).slice(0, 5).map((k) => <Progress key={k} label={meta(k).label} unit={meta(k).unit} pts={series(rows, k)} />)}
          {PAIRS.filter((p) => has(p.l) || has(p.r)).map((p) => <PairProgress key={p.label} label={p.label} l={series(rows, p.l)} r={series(rows, p.r)} />)}
          {SINGLES.filter(has).slice(5).map((k) => <Progress key={k} label={meta(k).label} unit={meta(k).unit} pts={series(rows, k)} />)}
        </section>
      )}

      {rows.length > 0 && (
        <section>
          <h2 className="label" style={{ paddingBottom: 6 }}>Historial</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, whiteSpace: 'nowrap' }}>
              <thead>
                <tr className="muted" style={{ fontSize: 11, letterSpacing: '0.06em' }}>
                  <th style={{ textAlign: 'left', padding: '6px 8px 6px 0' }}>FECHA</th>
                  {used.map((m) => <th key={m.k} style={{ textAlign: 'right', padding: '6px 8px' }}>{m.label.toUpperCase()}</th>)}
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.id} style={{ borderTop: '1px solid var(--linea)' }}>
                    <td style={{ padding: '8px 8px 8px 0' }}><Link href={`/perfil/medidas?fecha=${r.date}`} className="link" style={{ fontSize: 13 }}>{corta(r.date)}</Link>{r.note && <span className="muted" title={r.note}> ✎</span>}</td>
                    {used.map((m) => <td key={m.k} style={{ textAlign: 'right', padding: '8px', fontVariantNumeric: 'tabular-nums' }}>{r[m.k] != null ? fmt(r[m.k]!) : '—'}</td>)}
                    <td style={{ textAlign: 'right' }}>
                      <form action={deleteMeasure}><input type="hidden" name="id" value={r.id} /><button className="link" aria-label={`Borrar la medición del ${corta(r.date)}`} style={{ color: 'var(--campana)', fontSize: 13 }}>✕</button></form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="caption muted" style={{ paddingTop: 6 }}>Tocá una fecha para corregirla.</p>
        </section>
      )}
    </main>
  );
}

/** Una medida: valor actual, cambio contra la anterior y contra la primera, y la línea de cómo vino. */
function Progress({ label, unit, pts }: { label: string; unit: string; pts: { date: string; v: number }[] }) {
  const cur = pts[pts.length - 1];
  const prev = pts[pts.length - 2];
  const first = pts[0];
  const delta = (a: number, b: number) => { const d = Math.round((a - b) * 10) / 10; return d === 0 ? '= igual' : `${d < 0 ? '▼' : '▲'} ${fmt(Math.abs(d))} ${unit}`; };
  return (
    <div className="card bg-cuerda" style={{ gap: 6, padding: '14px 16px' }}>
      <div className="row" style={{ alignItems: 'baseline' }}>
        <span className="strong">{label}</span>
        <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 22 }}>{fmt(cur.v)} <span className="caption muted" style={{ fontFamily: 'var(--font-inter)', fontWeight: 500 }}>{unit}</span></span>
      </div>
      {prev && (
        <span className="caption">
          {delta(cur.v, prev.v)} <span className="muted">desde el {corta(prev.date)}</span>
          {pts.length > 2 && <> · {delta(cur.v, first.v)} <span className="muted">desde el comienzo ({corta(first.date)})</span></>}
        </span>
      )}
      {pts.length >= 2 ? <Spark pts={pts} unit={unit} label={label} /> : <span className="caption muted">Con la próxima medición vas a ver la línea de cómo cambia.</span>}
    </div>
  );
}

function Spark({ pts, unit, label }: { pts: { date: string; v: number }[]; unit: string; label: string }) {
  const W = 300, H = 64, P = 8;
  const t = (d: string) => new Date(d + 'T12:00:00Z').getTime();
  const t0 = t(pts[0].date), t1 = t(pts[pts.length - 1].date);
  const vs = pts.map((p) => p.v);
  let lo = Math.min(...vs), hi = Math.max(...vs);
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const x = (d: string) => P + ((t(d) - t0) / Math.max(1, t1 - t0)) * (W - 2 * P);
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  const path = pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ');
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${label}: de ${fmt(pts[0].v)} a ${fmt(pts[pts.length - 1].v)} ${unit}`}>
        <line x1={P} x2={W - P} y1={y(pts[0].v)} y2={y(pts[0].v)} stroke="var(--linea)" strokeWidth="1" strokeDasharray="3 4" />
        <path d={path} fill="none" stroke="var(--violeta)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, k) => {
          const lastPt = k === pts.length - 1;
          return (
            <g key={p.date}>
              <circle cx={x(p.date)} cy={y(p.v)} r={lastPt ? 5 : 3} fill="var(--violeta)" stroke="var(--cuerda)" strokeWidth="2" />
              {/* área de toque más grande que el punto, con el valor al pasar el dedo o el mouse */}
              <circle cx={x(p.date)} cy={y(p.v)} r="12" fill="transparent"><title>{`${corta(p.date)}: ${fmt(p.v)} ${unit}`}</title></circle>
            </g>
          );
        })}
      </svg>
      <figcaption className="row caption muted" style={{ fontSize: 11 }}><span>{corta(pts[0].date)}</span><span>{corta(pts[pts.length - 1].date)}</span></figcaption>
    </figure>
  );
}

const series = (rows: Measure[], k: MetricKey) => rows.filter((r) => r[k] != null).map((r) => ({ date: r.date, v: r[k] as number }));

/**
 * Brazo / muslo / pantorrilla: izquierda y derecha juntas, con la diferencia entre lados (simetría).
 * En el gráfico, izquierda = línea llena y derecha = línea punteada, con etiqueta en cada una.
 */
function PairProgress({ label, l, r }: { label: string; l: { date: string; v: number }[]; r: { date: string; v: number }[] }) {
  const L = l[l.length - 1], R = r[r.length - 1];
  const diff = L && R && L.date === R.date ? Math.round((L.v - R.v) * 10) / 10 : null;
  const ch = (pts: { v: number }[]) => (pts.length >= 2 ? Math.round((pts[pts.length - 1].v - pts[0].v) * 10) / 10 : null);
  const sign = (d: number | null) => (d == null ? '' : d === 0 ? ' (= igual)' : ` (${d < 0 ? '▼' : '▲'} ${fmt(Math.abs(d))} cm desde el comienzo)`);
  const all = [...l, ...r];
  return (
    <div className="card bg-cuerda" style={{ gap: 6, padding: '14px 16px' }}>
      <span className="strong">{label}</span>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
        {([['Izquierdo', L, ch(l), false], ['Derecho', R, ch(r), true]] as const).map(([side, p, d, dashed]) => (
          <span key={side} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <span className="caption muted" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <svg width="18" height="6" aria-hidden="true"><line x1="0" x2="18" y1="3" y2="3" stroke="var(--violeta)" strokeWidth="2" strokeDasharray={dashed ? '4 3' : undefined} /></svg>{side}
            </span>
            <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 20 }}>{p ? fmt(p.v) : '—'} <span className="caption muted" style={{ fontFamily: 'var(--font-inter)', fontWeight: 500 }}>cm</span></span>
            <span className="caption muted" style={{ fontSize: 11 }}>{sign(d).replace(/^ \(|\)$/g, '')}</span>
          </span>
        ))}
      </div>
      {diff != null && (
        <span className="caption">
          {diff === 0 ? 'Los dos lados están iguales 👌' : <>Diferencia entre lados: <b>{fmt(Math.abs(diff))} cm</b> <span className="muted">(el {diff > 0 ? 'izquierdo' : 'derecho'} es más grande)</span></>}
        </span>
      )}
      {all.length >= 3 && new Set(all.map((p) => p.date)).size >= 2
        ? <Spark2 l={l} r={r} label={label} />
        : <span className="caption muted">Con la próxima medición vas a ver la línea de cada lado.</span>}
    </div>
  );
}

function Spark2({ l, r, label }: { l: { date: string; v: number }[]; r: { date: string; v: number }[]; label: string }) {
  const W = 300, H = 72, P = 8, RIGHT = 34; // margen derecho para la etiqueta de cada línea
  const t = (d: string) => new Date(d + 'T12:00:00Z').getTime();
  const all = [...l, ...r];
  const dates = all.map((p) => t(p.date));
  const t0 = Math.min(...dates), t1 = Math.max(...dates);
  let lo = Math.min(...all.map((p) => p.v)), hi = Math.max(...all.map((p) => p.v));
  if (hi - lo < 1) { lo -= 0.5; hi += 0.5; }
  const x = (d: string) => P + ((t(d) - t0) / Math.max(1, t1 - t0)) * (W - P - RIGHT);
  const y = (v: number) => P + (1 - (v - lo) / (hi - lo)) * (H - 2 * P);
  // Etiquetas al final de cada línea, separadas si quedan muy cerca
  const ly = l.length ? y(l[l.length - 1].v) : 0, ry = r.length ? y(r[r.length - 1].v) : 0;
  const gap = 12 - Math.abs(ly - ry);
  const labelY = { Izquierdo: gap > 0 ? ly + (ly <= ry ? -gap / 2 : gap / 2) : ly, Derecho: gap > 0 ? ry + (ry < ly ? -gap / 2 : gap / 2) : ry };
  const line = (pts: { date: string; v: number }[], dashed: boolean, name: 'Izquierdo' | 'Derecho') => pts.length > 0 && (
    <g>
      <path d={pts.map((p, k) => `${k ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.v).toFixed(1)}`).join(' ')} fill="none" stroke="var(--violeta)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed ? '5 4' : undefined} />
      {pts.map((p, k) => (
        <g key={p.date}>
          <circle cx={x(p.date)} cy={y(p.v)} r={k === pts.length - 1 ? 4.5 : 3} fill={dashed ? 'var(--cuerda)' : 'var(--violeta)'} stroke="var(--violeta)" strokeWidth="2" />
          <circle cx={x(p.date)} cy={y(p.v)} r="11" fill="transparent"><title>{`${name} · ${corta(p.date)}: ${fmt(p.v)} cm`}</title></circle>
        </g>
      ))}
      <text x={x(pts[pts.length - 1].date) + 8} y={labelY[name] + 4} fontSize="11" fill="var(--campana)">{name === 'Izquierdo' ? 'Izq' : 'Der'}</text>
    </g>
  );
  return (
    <figure style={{ margin: 0 }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`${label}: izquierdo y derecho a lo largo del tiempo`}>
        {line(l, false, 'Izquierdo')}
        {line(r, true, 'Derecho')}
      </svg>
      <figcaption className="row caption muted" style={{ fontSize: 11, paddingRight: RIGHT / 3 }}><span>{corta(new Date(t0).toISOString().slice(0, 10))}</span><span>{corta(new Date(t1).toISOString().slice(0, 10))}</span></figcaption>
    </figure>
  );
}
