import Link from 'next/link';
import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { corta, today } from '@/lib/dates';
import { METRICS, fmt, type Measure, type MetricKey } from '@/lib/measures';
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
          {METRICS.map((m) => (
            <label key={m.k} className="field">
              <span>{m.label} ({m.unit})</span>
              <input className="input" name={m.k} inputMode="decimal" key={`${fecha}-${m.k}`}
                defaultValue={editing?.[m.k] != null ? fmt(editing[m.k]!) : ''} placeholder={last?.[m.k] != null ? fmt(last[m.k]!) : '—'} />
            </label>
          ))}
        </div>
        <details>
          <summary className="link" style={{ fontSize: 13, cursor: 'pointer' }}>¿Cómo medir cada una?</summary>
          <ul className="caption muted" style={{ margin: '8px 0 0', paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {METRICS.map((m) => <li key={m.k}><b>{m.label}:</b> {m.hint}.</li>)}
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
          {used.map((m) => <Progress key={m.k} label={m.label} unit={m.unit} pts={rows.filter((r) => r[m.k] != null).map((r) => ({ date: r.date, v: r[m.k] as number }))} />)}
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
