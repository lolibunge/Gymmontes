'use client';
import Link from 'next/link';
import { useState, useTransition } from 'react';
import { Back, Check, Chevron, Music } from '@/components/Icons';
import { fillPlanned, finishSession, saveSet } from '../actions';
import { corta } from '@/lib/dates';

type Row = { kg: string; reps: string; done: boolean; minutes: number | null };
export type RunnerItem = {
  id: number; kind: 'ejercicio' | 'cardio'; name: string; slug: string; sets: number; reps: string | null;
  note: string | null; rest: number; raise: boolean; segments: { label: string; min: number }[] | null;
  target: number | null; prev: { date: string; kg: string | null; reps: string } | null; rows: Row[];
};

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')));

export default function SessionRunner({ sessionId, date, past, finished, items: initial, start, spotify }: { sessionId: number; date: string; past: boolean; finished: boolean; items: RunnerItem[]; start: number; spotify: string }) {
  const [items, setItems] = useState(initial);
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
          <Link href="/rutina" className="icon-btn" aria-label="Volver a la rutina" style={{ marginLeft: -10 }}><Back /></Link>
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
          {it.raise && <p className="card bg-venda strong" style={{ padding: '10px 14px', fontSize: 14, marginBottom: 8 }}><span className="brand">▲ Llegaste al rango alto: hoy probá con más peso.</span></p>}
          {it.prev ? (
            <div className="row bg-venda" style={{ padding: '12px 14px', borderRadius: 4, fontSize: 13, color: 'var(--violeta-texto)' }}>
              <span>La vez pasada ({corta(it.prev.date)})</span>
              <span className="strong">{it.prev.kg != null ? `${Number(it.prev.kg)} kg · ` : ''}{it.prev.reps}</span>
            </div>
          ) : (
            <div className="row bg-cuerda" style={{ padding: '12px 14px', borderRadius: 4, fontSize: 13 }}>
              <span className="muted">Primera vez · peso sugerido</span>
              <span className="strong">{it.target != null ? `${it.target} kg` : '—'}</span>
            </div>
          )}
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
            <button className="btn btn-primary" style={{ flex: 1, minHeight: 64 }}>{finished ? 'Guardar cambios' : `Terminar sesión · ${doneItems} de ${items.length}`}</button>
          </form>
        )}
      </nav>
    </main>
  );
}
