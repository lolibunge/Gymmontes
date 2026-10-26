'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, useTransition } from 'react';
import { bell } from '@/lib/bell';
import { Back, Check, Chevron, Music } from '@/components/Icons';
import { fillPlanned, finishSession, saveFeel, saveSet } from '../actions';
import { corta } from '@/lib/dates';

type Row = { kg: string; reps: string; done: boolean; minutes: number | null };
export type RunnerItem = {
  id: number; kind: 'ejercicio' | 'cardio'; name: string; slug: string; sets: number; reps: string | null;
  note: string | null; rest: number; raise: boolean;
  up: { dir: 'up' | 'down'; reason: 'planilla' | 'reps' | 'liviano' | 'pesado'; kg: number | null; next: number | null } | null;
  feel: 'liviano' | 'justo' | 'pesado' | null; segments: { label: string; min: number }[] | null;
  target: number | null; prev: { date: string; kg: string | null; reps: string } | null; rows: Row[];
};

/** "40–60 s" → ejercicio por tiempo, de 40 a 60 segundos. */
export function timedRange(reps: string | null): [number, number] | null {
  if (!reps || !/\d\s*(s|seg|segundos?|″|")\s*$/i.test(reps.trim())) return null;
  const n = (reps.match(/\d+/g) ?? []).map(Number);
  return n.length ? [n[0], n[n.length - 1]] : null;
}

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function SessionRunner({ sessionId, date, past, finished, back, items: initial, start, spotify }: { back: string; sessionId: number; date: string; past: boolean; finished: boolean; items: RunnerItem[]; start: number; spotify: string }) {
  const [items, setItems] = useState(() => initial.map((x) => {
    const tr = x.kind === 'ejercicio' ? timedRange(x.reps) : null;
    if (!tr) return x;
    // Tiempo objetivo: el de la vez pasada; si la planilla marca ▲ (rango alto), el máximo; si no, el mínimo.
    const prevS = Number(x.prev?.reps.split('-').map(Number).filter(Boolean).pop()) || 0;
    const goal = x.raise ? tr[1] : Math.min(tr[1], Math.max(tr[0], prevS));
    return { ...x, rows: x.rows.map((r) => (r.reps ? r : { ...r, reps: String(goal) })) };
  }));
  const [i, setI] = useState(start);
  const [, startT] = useTransition();
  const it = items[i];
  const doneItems = items.filter((x) => x.rows.every((r) => r.done)).length;

  function update(rowIdx: number, patch: Partial<Row>, persist = false) {
    setItems((prev) => {
      const next = prev.map((x, k) => (k !== i ? x : { ...x, rows: x.rows.map((r, j) => (j === rowIdx ? { ...r, ...patch } : r)) }));
      if (persist) {
        const r = next[i].rows[rowIdx];
        startT(() => { saveSet(sessionId, next[i].id, rowIdx + 1, num(r.kg), num(r.reps), r.done).catch(() => {}); });
      }
      return next;
    });
  }

  const activeRow = it.rows.findIndex((r) => !r.done);
  const minutes = (it.segments ?? []).reduce((a, s) => a + s.min, 0);

  return (
    <main className="page tight" style={{ paddingBottom: 130 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row">
          <Link href={back} className="icon-btn" aria-label="Volver a la rutina" style={{ marginLeft: -10 }}><Back /></Link>
          <span className="caption muted" style={{ fontWeight: 500 }}>{corta(date)} · ejercicio {i + 1} de {items.length}</span>
          <a href={spotify} target="_blank" rel="noopener" className="icon-btn" aria-label="Abrir música en Spotify" style={{ marginRight: -10 }}><Music color="var(--violeta-texto)" size={20} /></a>
        </div>
        {past && doneItems < items.length && (
          <form action={fillPlanned} className="card bg-venda" style={{ gap: 10, padding: '14px 16px' }}>
            <input type="hidden" name="id" value={sessionId} />
            <span className="strong" style={{ color: 'var(--guante)' }}>{finished ? `Corrigiendo la sesión del ${corta(date)}` : `Estás cargando una sesión del ${corta(date)}`}</span>
            <span className="caption muted">{finished ? 'Marcá las series que faltaron, o completá lo que falta con el peso y las reps de la rutina.' : 'Si la hiciste como dice la rutina, completala de una vez y después corregí lo que haya sido distinto.'}</span>
            <button className="btn btn-outline" style={{ minHeight: 44, fontSize: 14 }}>{finished ? 'Completar lo que falta' : 'Completar con la rutina'}</button>
          </form>
        )}
        <div aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
          {items.map((x, k) => (
            <span key={x.id} style={{ flex: 1, height: 4, background: x.rows.every((r) => r.done) ? 'var(--violeta)' : k === i ? 'var(--guante)' : 'var(--linea)' }} />
          ))}
        </div>
      </header>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="label brand">{it.kind === 'cardio' ? 'Cardio' : `Ejercicio ${String(i + 1).padStart(2, '0')}`}</span>
        <h1 className="title">{it.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 14 }}>
          {it.kind === 'ejercicio' ? (
            <>
              <span className="strong">{it.sets} × {it.reps}</span>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--campana)' }} />
              <span className="muted">Descanso {it.rest} s</span>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--campana)' }} />
              <Link href={`/ejercicio/${it.slug}`} className="link">Ver cómo se hace</Link>
            </>
          ) : (
            <span className="strong">{minutes} minutos por tramos</span>
          )}
        </div>
        {it.note && <p className="caption muted">{it.note}</p>}
      </section>

      {it.kind === 'ejercicio' ? (
        <section>
          {timedRange(it.reps) ? (
            it.raise && <p className="card bg-venda strong" style={{ padding: '10px 14px', fontSize: 14, marginBottom: 8 }}><span className="brand">▲ Hoy probá con {timedRange(it.reps)![1]} segundos.</span></p>
          ) : it.up && (
            <RaiseCard up={it.up} rows={it.rows} onPick={(kg) => it.rows.forEach((r, j) => { if (!r.done) update(j, { kg }); })} />
          )}
          {it.prev ? (
            <div className="row bg-venda" style={{ padding: '12px 14px', borderRadius: 4, fontSize: 13, color: 'var(--violeta-texto)' }}>
              <span>La vez pasada ({corta(it.prev.date)})</span>
              <span className="strong">{timedRange(it.reps) ? `${it.prev.reps} s` : `${it.prev.kg != null ? `${Number(it.prev.kg)} kg · ` : ''}${it.prev.reps}`}</span>
            </div>
          ) : (
            <div className="row bg-cuerda" style={{ padding: '12px 14px', borderRadius: 4, fontSize: 13 }}>
              <span className="muted">{timedRange(it.reps) ? 'Primera vez · tiempo objetivo' : 'Primera vez · peso sugerido'}</span>
              <span className="strong">{timedRange(it.reps) ? it.reps : it.target != null ? `${it.target} kg` : '—'}</span>
            </div>
          )}
          {timedRange(it.reps) ? (
            <TimedSets key={it.id} rows={it.rows} activeRow={activeRow} update={update} />
          ) : (
            <>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }} className="muted">
            <span style={{ width: 40 }}>SERIE</span><span style={{ flex: 1, paddingLeft: 14 }}>KG</span><span style={{ flex: 1, paddingLeft: 14 }}>REPS</span><span style={{ width: 44 }} />
          </div>
          {it.rows.map((r, j) => {
            const isActive = j === activeRow;
            const pending = !r.done && !isActive;
            const field: React.CSSProperties = {
              flex: 1, height: 48, padding: '0 14px', border: 0, borderRadius: 4, width: '100%',
              background: r.done ? 'var(--cuerda)' : 'var(--lona)',
              boxShadow: r.done ? 'none' : 'inset 0 0 0 1.5px var(--linea)',
              fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 20,
              color: pending ? 'var(--campana)' : 'var(--guante)',
            };
            return (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ width: 40, fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 18, color: pending ? 'var(--campana)' : 'var(--guante)' }}>{j + 1}</span>
                <label style={{ flex: 1, display: 'flex' }}>
                  <span className="sr">Kg de la serie {j + 1}</span>
                  <input style={field} inputMode="decimal" value={r.kg} placeholder="—" onChange={(e) => update(j, { kg: e.target.value })} onBlur={() => r.done && update(j, {}, true)} />
                </label>
                <label style={{ flex: 1, display: 'flex' }}>
                  <span className="sr">Reps de la serie {j + 1}</span>
                  <input style={field} inputMode="numeric" value={r.reps} placeholder="—" onChange={(e) => update(j, { reps: e.target.value })} onBlur={() => r.done && update(j, {}, true)} />
                </label>
                <button type="button" onClick={() => update(j, { done: !r.done }, true)}
                  aria-label={r.done ? `Serie ${j + 1} hecha. Tocá para desmarcar` : `Marcar serie ${j + 1} como hecha`} aria-pressed={r.done}
                  style={{ width: 44, height: 44, flexShrink: 0, border: 0, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: r.done ? 'var(--violeta)' : 'transparent',
                    boxShadow: r.done ? 'none' : `inset 0 0 0 2px ${isActive ? 'var(--guante)' : 'var(--linea)'}` }}>
                  <Check color={r.done ? 'var(--on-violeta)' : isActive ? 'var(--guante)' : 'transparent'} />
                </button>
              </div>
            );
          })}
              <FeelPicker value={it.feel} onChange={(f) => {
                setItems((prev) => prev.map((x, k) => (k === i ? { ...x, feel: f } : x)));
                startT(() => { saveFeel(sessionId, it.id, f).catch(() => {}); });
              }} />
            </>
          )}
        </section>
      ) : (
        <section className="card bg-cuerda" style={{ gap: 12 }}>
          <div aria-hidden="true" style={{ display: 'flex', gap: 3, height: 10 }}>
            {(it.segments ?? []).map((s, k) => <span key={k} style={{ flex: s.min, background: s.label === 'Suave' ? 'var(--linea)' : 'var(--violeta)' }} />)}
          </div>
          <p className="caption muted">{(it.segments ?? []).map((s) => `${Number.isInteger(s.min) ? `${s.min}′` : `${Math.round(s.min * 60)}″`} ${s.label.toLowerCase()}`).join(' · ')}</p>
          {it.rows[0].done
            ? <p className="strong brand">Hecho: {it.rows[0].minutes ?? minutes} minutos</p>
            : <Link href={`/timer/${sessionId}/${it.id}`} className="btn btn-primary">Abrir timer <span aria-hidden="true">▶</span></Link>}
        </section>
      )}

      <nav aria-label="Ejercicios" className="step-nav" style={{ gridTemplateColumns: i > 0 ? '56px 1fr' : '1fr' }}>
        {i > 0 && (
          <button type="button" className="step-btn step-prev" onClick={() => setI(i - 1)} aria-label={`Ejercicio anterior: ${items[i - 1].name}`}>
            <Back size={22} color="var(--guante)" />
          </button>
        )}
        {i < items.length - 1 ? (
          <button type="button" className="step-btn" onClick={() => setI(i + 1)}>
            <span className="step-text">
              <span className="step-label">Siguiente</span>
              <span className="strong step-name">{items[i + 1].name}{items[i + 1].kind === 'ejercicio' ? ` · ${items[i + 1].sets} × ${items[i + 1].reps}` : ''}</span>
            </span>
            <Chevron color="var(--guante)" size={20} />
          </button>
        ) : (
          <form action={finishSession} style={{ display: 'flex' }}>
            <input type="hidden" name="id" value={sessionId} />
            {past && <input type="hidden" name="volver" value={back} />}
            <button className="btn btn-primary" style={{ flex: 1, minHeight: 64 }}>{finished ? 'Guardar cambios' : `Terminar sesión · ${doneItems} de ${items.length}`}</button>
          </form>
        )}
      </nav>
    </main>
  );
}

/** Series por tiempo (ej. plancha): un cronómetro por serie que suena y marca la serie al terminar. */
function TimedSets({ rows, activeRow, update }: { rows: Row[]; activeRow: number; update: (j: number, patch: Partial<Row>, persist?: boolean) => void }) {
  const [run, setRun] = useState<{ row: number; end: number; total: number } | null>(null);
  const [now, setNow] = useState(Date.now());
  const done = useRef(false);

  useEffect(() => {
    if (!run) return;
    done.current = false;
    let lock: any;
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock = l)).catch(() => {});
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => { clearInterval(t); lock?.release?.(); };
  }, [run]);

  const left = run ? Math.max(0, Math.ceil((run.end - now) / 1000)) : 0;
  useEffect(() => {
    if (run && left === 0 && !done.current) {
      done.current = true;
      bell();
      update(run.row, { reps: String(run.total), done: true }, true);
      setRun(null);
    }
  }, [left, run, update]);

  function toggle(j: number) {
    if (run?.row === j) {
      // Parar antes: se guardan los segundos que aguantó
      const held = run.total - left;
      update(j, { reps: String(Math.max(1, held)), done: true }, true);
      setRun(null);
      return;
    }
    const total = Number(rows[j].reps) || 30;
    setNow(Date.now());
    setRun({ row: j, end: Date.now() + total * 1000, total });
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 0 6px', fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }} className="muted">
        <span style={{ width: 40 }}>SERIE</span><span style={{ flex: 1, paddingLeft: 14 }}>SEGUNDOS</span><span style={{ width: 104 }} />
      </div>
      {rows.map((r, j) => {
        const isActive = j === activeRow;
        const pending = !r.done && !isActive;
        const running = run?.row === j;
        return (
          <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
            <span style={{ width: 40, fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 18, color: pending ? 'var(--campana)' : 'var(--guante)' }}>{j + 1}</span>
            <label style={{ flex: 1, display: 'flex' }}>
              <span className="sr">Segundos de la serie {j + 1}</span>
              <input inputMode="numeric" value={running ? String(left) : r.reps} readOnly={running} placeholder="—"
                onChange={(e) => update(j, { reps: e.target.value.replace(/\D/g, '') })} onBlur={() => r.done && update(j, {}, true)}
                style={{ flex: 1, height: 48, padding: '0 14px', border: 0, borderRadius: 4, width: '100%', fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 20,
                  background: running ? 'var(--venda)' : r.done ? 'var(--cuerda)' : 'var(--lona)', boxShadow: r.done || running ? 'none' : 'inset 0 0 0 1.5px var(--linea)',
                  color: running ? 'var(--violeta-texto)' : pending ? 'var(--campana)' : 'var(--guante)' }} />
            </label>
            <button type="button" onClick={() => toggle(j)} disabled={!!run && !running}
              aria-label={running ? `Parar, aguanté ${run!.total - left} segundos` : `Empezar ${r.reps || 30} segundos`}
              style={{ width: 48, height: 44, flexShrink: 0, border: 0, borderRadius: 4, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: running ? 'var(--guante)' : 'var(--violeta)', color: running ? 'var(--lona)' : 'var(--on-violeta)', opacity: run && !running ? 0.4 : 1 }}>
              {running
                ? <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><rect x="3" y="3" width="10" height="10" fill="currentColor" /></svg>
                : <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M4 2.5v11l9-5.5z" fill="currentColor" /></svg>}
            </button>
            <button type="button" onClick={() => update(j, { done: !r.done }, true)}
              aria-label={r.done ? `Serie ${j + 1} hecha. Tocá para desmarcar` : `Marcar serie ${j + 1} como hecha`} aria-pressed={r.done}
              style={{ width: 44, height: 44, flexShrink: 0, border: 0, borderRadius: 999, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: r.done ? 'var(--violeta)' : 'transparent',
                boxShadow: r.done ? 'none' : `inset 0 0 0 2px ${isActive ? 'var(--guante)' : 'var(--linea)'}` }}>
              <Check color={r.done ? 'var(--on-violeta)' : isActive ? 'var(--guante)' : 'transparent'} />
            </button>
          </div>
        );
      })}
      <p className="caption muted" style={{ paddingTop: 6 }}>Tocá ▶ y mantené la posición. Suena la campana al terminar y la serie se marca sola. Si parás antes, se guardan los segundos que aguantaste.</p>
    </>
  );
}

const FEELS: { v: 'liviano' | 'justo' | 'pesado'; label: string }[] = [
  { v: 'liviano', label: 'Liviano' }, { v: 'justo', label: 'Justo' }, { v: 'pesado', label: 'Pesado' },
];

/** "¿Cómo te resultó el peso?": si marca Liviano, la próxima vez la app sugiere subir. */
function FeelPicker({ value, onChange }: { value: 'liviano' | 'justo' | 'pesado' | null; onChange: (v: 'liviano' | 'justo' | 'pesado' | null) => void }) {
  return (
    <div role="group" aria-label="¿Cómo te resultó el peso?" style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 12, flexWrap: 'wrap' }}>
      <span className="caption muted" style={{ width: '100%' }}>¿Cómo te resultó el peso?</span>
      {FEELS.map((f) => {
        const on = value === f.v;
        return (
          <button key={f.v} type="button" aria-pressed={on} onClick={() => onChange(on ? null : f.v)}
            style={{ flex: 1, height: 38, padding: '0 12px', border: 0, borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
              background: on ? (f.v === 'liviano' ? 'var(--violeta)' : f.v === 'pesado' ? '#c62828' : 'var(--guante)') : 'var(--cuerda)',
              color: on ? (f.v === 'liviano' ? 'var(--on-violeta)' : f.v === 'pesado' ? '#ffffff' : 'var(--lona)') : 'var(--guante)' }}>
            {on && f.v === 'liviano' ? '▲ ' : on && f.v === 'pesado' ? '▼ ' : ''}{f.label}
          </button>
        );
      })}
    </div>
  );
}

const STEPS = [0.5, 5, 10];
const kgTxt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');

/** Aviso "▲ Toca subir" con las subas habituales: +0,5, +5 o +10 kg sobre el peso de la vez pasada. */
function RaiseCard({ up, rows, onPick }: { up: NonNullable<RunnerItem['up']>; rows: Row[]; onPick: (kg: string) => void }) {
  const base = up.kg;
  const down = up.dir === 'down';
  const current = rows.find((r) => !r.done)?.kg ?? rows[0]?.kg ?? '';
  return (
    <div className="card" style={{ padding: '12px 14px', marginBottom: 8, gap: 10, background: down ? 'var(--alerta-suave)' : 'var(--venda)' }}>
      <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="strong" style={{ fontSize: 14, color: down ? 'var(--alerta)' : 'var(--violeta-texto)' }}>{down ? '▼ Probá bajar un poco' : '▲ Toca subir el peso'}</span>
        <span className="caption muted">{up.reason === 'pesado' ? 'La vez pasada te resultó pesado.' : up.reason === 'liviano' ? 'La vez pasada te resultó liviano.' : up.reason === 'reps' ? 'La vez pasada llegaste al máximo de reps en todas las series.' : 'Lo marcó la entrenadora en tu rutina.'}</span>
      </span>
      {base != null && base > 0 && (
        <div role="group" aria-label={down ? 'Cuánto bajar' : 'Cuánto subir'} style={{ display: 'flex', gap: 8 }}>
          {STEPS.filter((st) => !down || base - st > 0).map((st) => {
            const kg = kgTxt(down ? base - st : base + st);
            const on = current.replace('.', ',') === kg;
            return (
              <button key={st} type="button" aria-pressed={on} onClick={() => onPick(on ? kgTxt(base) : kg)}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0, padding: '6px 4px', border: 0, borderRadius: 4, cursor: 'pointer',
                  background: on ? (down ? '#c62828' : 'var(--violeta)') : 'var(--lona)', color: on ? (down ? '#ffffff' : 'var(--on-violeta)') : 'var(--guante)', boxShadow: on ? 'none' : 'inset 0 0 0 1.5px var(--linea)' }}>
                <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 15 }}>{down ? '−' : '+'}{kgTxt(st)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, opacity: 0.8 }}>{kg} kg</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
