'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { bell } from '@/lib/bell';
import { Back, Check, Chevron, Music } from '@/components/Icons';
import { discardSession, fillPlanned, finishSession } from '../actions';
import { corta } from '@/lib/dates';
import { clearDraft, flush, onPending, pendingCount, push, readDraft, writeDraft, type Draft } from '@/lib/outbox';
import { adjustRest, ENDING_RED, isEnding, mmss, setRestPref, startRest, stopRest, useEndingTicks, useTimers } from '@/lib/timers';
import { useWakeLock } from '@/lib/wakelock';
import { openTimerPip, PipIcon } from '@/components/TimerDock';
import { closePip, pipAuto, pipOpen, pipSupported, setPipAuto } from '@/lib/pip';
import NoteSheet from '@/components/NoteSheet';
import RestModal from '@/components/RestModal';
import WarmPanel from './WarmPanel';
import type { WarmStep } from '@/lib/warmup';
import { askNotifications } from '@/lib/bgnotify';

type Row = { kg: string; reps: string; done: boolean; minutes: number | null };
export type RunnerItem = {
  id: number; kind: 'ejercicio' | 'cardio'; name: string; slug: string; sets: number; reps: string | null;
  note: string | null; rest: number; raise: boolean;
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

export default function SessionRunner({ sessionId, date, past, finished, back, items: initial, start, startAtWarmup, warm, cool, spotify }: { back: string; sessionId: number; date: string; past: boolean; finished: boolean; items: RunnerItem[]; start: number; startAtWarmup: boolean; warm: WarmStep[]; cool: WarmStep[]; spotify: string }) {
  const [items, setItems] = useState(() => initial.map((x) => {
    const tr = x.kind === 'ejercicio' ? timedRange(x.reps) : null;
    if (!tr) return x;
    // Tiempo objetivo: el de la vez pasada; si la planilla marca ▲ (rango alto), el máximo; si no, el mínimo.
    const prevS = Number(x.prev?.reps.split('-').map(Number).filter(Boolean).pop()) || 0;
    const goal = x.raise ? tr[1] : Math.min(tr[1], Math.max(tr[0], prevS));
    return { ...x, rows: x.rows.map((r) => (r.reps ? r : { ...r, reps: String(goal) })) };
  }));
  // i: -1 = calentamiento, 0..n-1 = ejercicios, n = enfriamiento
  const lo = warm.length ? -1 : 0;
  const hi = cool.length ? initial.length : initial.length - 1;
  const clamp = (k: number) => Math.max(lo, Math.min(hi, k));
  const [i, setI] = useState(() => clamp(startAtWarmup ? -1 : start));
  const [phase, setPhase] = useState<{ warm?: 'hecho' | 'salteado'; cool?: 'hecho' | 'salteado' }>({});
  const [restOpen, setRestOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [pending, setPending] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [note, setNote] = useState(false);
  const [pipOk, setPipOk] = useState(false);
  const { timers, now, restPref } = useTimers(250);
  const inWarm = i === -1, inCool = i === items.length;
  const it = items[Math.max(0, Math.min(items.length - 1, i))];
  const doneItems = items.filter((x) => x.rows.every((r) => r.done)).length;
  const anyDone = items.some((x) => x.rows.some((r) => r.done));

  useWakeLock(!past);

  // Al abrir: recuperar lo que quedó guardado en el teléfono (refresco, atrás, sin señal…)
  useEffect(() => {
    const d = readDraft(sessionId);
    if (d) {
      setItems((prev) => prev.map((x) => {
        const di = d.items[x.id];
        if (!di) return x;
        return {
          ...x,
          feel: di.feel !== undefined ? di.feel : x.feel,
          rows: x.rows.map((r, j) => (di.rows[j] ? { ...r, kg: di.rows[j].kg, reps: di.rows[j].reps, done: di.rows[j].done } : r)),
        };
      }));
      if (d.phase) {
        setPhase(d.phase);
        // Ya hizo o salteó el calentamiento: no volver a mostrarlo al abrir
        if (d.phase.warm) setI((k) => (k === -1 ? 0 : k));
      }
    }
    setReady(true);
    setPipOk(pipSupported());
    setPending(pendingCount(sessionId));
    flush().catch(() => {});
    return onPending(() => setPending(pendingCount(sessionId)));
  }, [sessionId]);

  // Guardar en el teléfono cada cambio
  useEffect(() => {
    if (!ready) return;
    const d: Draft = { at: Date.now(), items: {}, phase };
    for (const x of items) d.items[x.id] = { rows: x.rows.map((r) => ({ kg: r.kg, reps: r.reps, done: r.done })), feel: x.feel };
    writeDraft(sessionId, d);
  }, [items, ready, sessionId, phase]);

  // Recordar en qué ejercicio estás (para volver al mismo después de ver el video o refrescar)
  useEffect(() => {
    try { const u = new URL(window.location.href); u.searchParams.set('paso', String(i)); window.history.replaceState(window.history.state, '', u.toString()); } catch {}
  }, [i]);

  function update(rowIdx: number, patch: Partial<Row>, persist = false) {
    const cur = items[i];
    const row = { ...cur.rows[rowIdx], ...patch };
    setItems((prev) => prev.map((x, k) => (k !== i ? x : { ...x, rows: x.rows.map((r, j) => (j === rowIdx ? { ...r, ...patch } : r)) })));
    if (persist) push({ t: 'set', s: sessionId, i: cur.id, n: rowIdx + 1, kg: num(row.kg), reps: num(row.reps), done: row.done });
    // Recién marcada como hecha: arranca el descanso (salvo que sea la última serie de la sesión)
    if (patch.done === true && !cur.rows[rowIdx].done && !past) {
      const restLeft = cur.rows.filter((r, j) => j !== rowIdx && !r.done).length;
      const nextItem = items[i + 1];
      const nextRow = cur.rows.findIndex((r, j) => j !== rowIdx && !r.done);
      const setTxt = (x: RunnerItem, r: Row) => (x.kind === 'cardio' ? 'Cardio por tramos' : timedRange(x.reps) ? `${r.reps || x.reps} segundos` : `${r.kg ? `${r.kg} kg × ` : ''}${r.reps || x.reps} reps`);
      // Ventanita flotante en cada descanso (si la usó alguna vez), para verlo desde cualquier app
      if (pipAuto() && pipSupported() && !pipOpen()) openTimerPip().catch(() => {});
      if (restLeft > 0) { startRest(sessionId, i, `${cur.name} · serie ${nextRow + 1} de ${cur.rows.length}`, setTxt(cur, cur.rows[nextRow])); }
      else if (nextItem) { startRest(sessionId, i + 1, `Sigue: ${nextItem.name}`, setTxt(nextItem, nextItem.rows[0])); }
      // Última serie del último ejercicio: directo al enfriamiento (si hay)
      else if (cool.length && i === items.length - 1) setTimeout(() => go(items.length), 600);
    }
    if (patch.done === false && timers.rest?.sessionId === sessionId) { cancelRest.current = true; stopRest(); setRestOpen(false); }
  }

  async function finish() {
    setBusy(true); setMsg(null);
    const ok = await flush();
    if (!ok) {
      setBusy(false);
      setMsg('Sin conexión. Tus series quedaron guardadas en el teléfono: probá de nuevo cuando tengas señal.');
      return;
    }
    stopRest();
    closePip();
    clearDraft(sessionId);
    const fd = new FormData();
    fd.set('id', String(sessionId));
    if (past) fd.set('volver', back);
    try { await finishSession(fd); } catch (e: any) {
      // redirect() de Next se lanza como error: no es un error real
      if (String(e?.digest ?? e?.message ?? '').includes('NEXT_REDIRECT')) throw e;
      setBusy(false);
      setMsg('No se pudo terminar la sesión. Probá de nuevo.');
    }
  }

  const activeRow = it.rows.findIndex((r) => !r.done);
  const minutes = (it.segments ?? []).reduce((a, s) => a + s.min, 0);
  const rest = timers.rest?.sessionId === sessionId ? timers.rest : null;
  useEffect(() => { if (!rest) setRestOpen(false); }, [rest]);
  // Cuando termina (o se salta) el descanso de la última serie, pasar solo al ejercicio siguiente.
  // Si desmarcaste la serie, o ya te moviste a otro ejercicio, no se mueve.
  const lastRest = useRef<typeof rest>(null);
  const cancelRest = useRef(false);
  useEffect(() => {
    const prev = lastRest.current;
    lastRest.current = rest;
    if (prev && !rest) {
      const cancelled = cancelRest.current;
      cancelRest.current = false;
      if (!cancelled && prev.step === i + 1) setI(clamp(prev.step));
    }
  }, [rest, i]);
  // Al terminar el descanso, si estaba en otro ejercicio, ir al que sigue
  const go = (k: number) => setI(clamp(k));
  const cardioT = timers.cardio && timers.cardio.itemId === it.id && timers.cardio.sessionId === sessionId ? timers.cardio : null;
  const cardioDone = it.rows[0]?.done || !!cardioT?.done;

  return (
    <main className="page tight" style={{ paddingBottom: 130 }}>
      <header style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div className="row">
          <Link href={back} className="icon-btn" aria-label="Volver a la rutina" style={{ marginLeft: -10 }}><Back /></Link>
          <span className="caption muted" style={{ fontWeight: 500 }}>{corta(date)} · {inWarm ? 'calentamiento' : inCool ? 'enfriamiento' : `ejercicio ${i + 1} de ${items.length}`}</span>
          <span style={{ display: 'flex', marginRight: -10 }}>
            <button type="button" className="icon-btn" aria-label="Escribir una nota de prueba" onClick={() => setNote(true)}><NoteIcon /></button>
            <a href={spotify} target="_blank" rel="noopener" className="icon-btn" aria-label="Abrir música en Spotify"><Music color="var(--violeta-texto)" size={20} /></a>
          </span>
        </div>
        {past && doneItems < items.length && (
          <form action={fillPlanned} onSubmit={() => clearDraft(sessionId)} className="card bg-venda" style={{ gap: 10, padding: '14px 16px' }}>
            <input type="hidden" name="id" value={sessionId} />
            <span className="strong" style={{ color: 'var(--guante)' }}>{finished ? `Corrigiendo la sesión del ${corta(date)}` : `Estás cargando una sesión del ${corta(date)}`}</span>
            <span className="caption muted">{finished ? 'Marcá las series que faltaron, o completá lo que falta con el peso y las reps de la rutina.' : 'Si la hiciste como dice la rutina, completala de una vez y después corregí lo que haya sido distinto.'}</span>
            <button className="btn btn-outline" style={{ minHeight: 44, fontSize: 14 }}>{finished ? 'Completar lo que falta' : 'Completar con la rutina'}</button>
          </form>
        )}
        <div aria-hidden="true" style={{ display: 'flex', gap: 4 }}>
          {warm.length > 0 && <span style={{ flex: 0.5, height: 4, background: inWarm ? 'var(--guante)' : phase.warm === 'hecho' ? 'var(--violeta)' : 'var(--linea)' }} />}
          {items.map((x, k) => (
            <span key={x.id} style={{ flex: 1, height: 4, background: x.rows.every((r) => r.done) ? 'var(--violeta)' : k === i ? 'var(--guante)' : 'var(--linea)' }} />
          ))}
          {cool.length > 0 && <span style={{ flex: 0.5, height: 4, background: inCool ? 'var(--guante)' : phase.cool === 'hecho' ? 'var(--violeta)' : 'var(--linea)' }} />}
        </div>
      </header>

      {inWarm || inCool ? (
        <WarmPanel key={inWarm ? 'warm' : 'cool'} kind={inWarm ? 'calentamiento' : 'enfriamiento'} steps={inWarm ? warm : cool} status={inWarm ? phase.warm : phase.cool}
          onDone={(st) => {
            setPhase((p) => ({ ...p, [inWarm ? 'warm' : 'cool']: st }));
            if (inWarm) go(0); else if (anyDone || finished) finish();
          }} />
      ) : (<>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <span className="label brand">{it.kind === 'cardio' ? 'Cardio' : `Ejercicio ${String(i + 1).padStart(2, '0')}`}</span>
        <h1 className="title">{it.name}</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 14 }}>
          {it.kind === 'ejercicio' ? (
            <>
              <span className="strong">{it.sets} × {it.reps}</span>
              <span aria-hidden="true" style={{ width: 4, height: 4, borderRadius: 999, background: 'var(--campana)' }} />
              <Link href={`/ejercicio/${it.slug}?volver=${encodeURIComponent(`/sesion/${sessionId}?paso=${i}`)}`} className="link">Ver cómo se hace</Link>
            </>
          ) : (
            <span className="strong">{minutes} minutos por tramos</span>
          )}
        </div>
        {it.note && <p className="caption muted">{it.note}</p>}
      </section>

      {rest && (
        <section className="rest-bar" aria-live="polite" style={{ flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'flex-start', gap: 8, minWidth: 0, flex: '1 1 100%' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.1em', color: '#d69ae8' }}>DESCANSO</span>
              <span className="rest-time" style={isEnding((rest.endsAt - now) / 1000) ? { color: ENDING_RED } : undefined}>{mmss((rest.endsAt - now) / 1000)}</span>
              <span style={{ fontSize: 12, color: '#bdbdbd' }}>{rest.label}</span>
            </span>
            <button type="button" onClick={() => setRestOpen(true)} aria-label="Ver el descanso en pantalla completa" style={{ flex: '0 0 auto', width: 44 }}><ExpandIcon /></button>
          </span>
          <button type="button" onClick={() => adjustRest(-15)} aria-label="15 segundos menos">−15</button>
          <button type="button" onClick={() => adjustRest(15)} aria-label="15 segundos más">+15</button>
          {pipOk && <button type="button" onClick={() => openTimerPip()} aria-label="Ver el descanso en una ventanita flotante"><PipIcon /></button>}
          <button type="button" onClick={() => stopRest()}>Saltar</button>
        </section>
      )}

      {it.kind === 'ejercicio' ? (
        <section>
          {timedRange(it.reps) && it.raise && <p className="card bg-venda strong" style={{ padding: '10px 14px', fontSize: 14, marginBottom: 8 }}><span className="brand">▲ Hoy probá con {timedRange(it.reps)![1]} segundos.</span></p>}
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
            const pendingRow = !r.done && !isActive;
            const field: React.CSSProperties = {
              flex: 1, height: 48, padding: '0 14px', border: 0, borderRadius: 4, width: '100%',
              background: r.done ? 'var(--cuerda)' : 'var(--lona)',
              boxShadow: r.done ? 'none' : 'inset 0 0 0 1.5px var(--linea)',
              fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 20,
              color: pendingRow ? 'var(--campana)' : 'var(--guante)',
            };
            return (
              <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
                <span style={{ width: 40, fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 18, color: pendingRow ? 'var(--campana)' : 'var(--guante)' }}>{j + 1}</span>
                <label style={{ flex: 1, display: 'flex' }}>
                  <span className="sr">Kg de la serie {j + 1}</span>
                  <input style={field} inputMode="decimal" value={r.kg} placeholder="—" onChange={(e) => update(j, { kg: e.target.value })} onBlur={() => update(j, {}, true)} />
                </label>
                <label style={{ flex: 1, display: 'flex' }}>
                  <span className="sr">Reps de la serie {j + 1}</span>
                  <input style={field} inputMode="numeric" value={r.reps} placeholder="—" onChange={(e) => update(j, { reps: e.target.value.replace(/[^\d]/g, '') })} onBlur={() => update(j, {}, true)} />
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
                push({ t: 'feel', s: sessionId, i: it.id, feel: f });
              }} />
            </>
          )}
          {!past && <RestSetting value={restPref} pipOk={pipOk} />}
        </section>
      ) : (
        <section className="card bg-cuerda" style={{ gap: 12 }}>
          <div aria-hidden="true" style={{ display: 'flex', gap: 3, height: 10 }}>
            {(it.segments ?? []).map((s, k) => <span key={k} style={{ flex: s.min, background: s.label === 'Suave' ? 'var(--linea)' : 'var(--violeta)' }} />)}
          </div>
          <p className="caption muted">{(it.segments ?? []).map((s) => `${Number.isInteger(s.min) ? `${s.min}′` : `${Math.round(s.min * 60)}″`} ${s.label.toLowerCase()}`).join(' · ')}</p>
          {cardioDone
            ? <p className="strong brand">Hecho: {it.rows[0].minutes ?? minutes} minutos</p>
            : <Link href={`/timer/${sessionId}/${it.id}`} className="btn btn-primary">{cardioT && (cardioT.since != null || cardioT.base > 0) ? 'Volver al timer' : 'Abrir timer'} <span aria-hidden="true">▶</span></Link>}
        </section>
      )}

      </>)}

      {pending > 0 && <p className="caption muted" role="status">Guardado en el teléfono · {pending} {pending === 1 ? 'cambio' : 'cambios'} sin subir todavía</p>}
      {msg && <p className="card bg-alerta caption strong" role="alert" style={{ padding: '10px 14px' }}>{msg}</p>}

      <nav aria-label="Ejercicios" className="step-nav" style={{ gridTemplateColumns: i > lo ? '56px 1fr' : '1fr' }}>
        {i > lo && (
          <button type="button" className="step-btn step-prev" onClick={() => go(i - 1)} aria-label={`Anterior: ${i - 1 === -1 ? 'calentamiento' : items[i - 1].name}`}>
            <Back size={22} color="var(--guante)" />
          </button>
        )}
        {i < hi ? (
          <button type="button" className="step-btn" onClick={() => {
            if (inWarm) setPhase((p) => ({ ...p, warm: p.warm ?? 'salteado' }));
            go(i + 1);
          }}>
            <span className="step-text">
              <span className="step-label">{inWarm ? 'Saltar calentamiento' : 'Siguiente'}</span>
              <span className="strong step-name">{i + 1 === items.length ? 'Enfriamiento y estiramientos' : `${items[i + 1].name}${items[i + 1].kind === 'ejercicio' ? ` · ${items[i + 1].sets} × ${items[i + 1].reps}` : ''}`}</span>
            </span>
            <Chevron color="var(--guante)" size={20} />
          </button>
        ) : anyDone || finished ? (
          <button type="button" className="btn btn-primary" style={{ flex: 1, minHeight: 64 }} disabled={busy} onClick={finish}>
            {busy ? 'Guardando…' : finished ? 'Guardar cambios' : `Terminar sesión · ${doneItems} de ${items.length}`}
          </button>
        ) : (
          <form action={discardSession} onSubmit={() => { clearDraft(sessionId); stopRest(); }} style={{ display: 'flex' }}>
            <input type="hidden" name="id" value={sessionId} />
            <input type="hidden" name="volver" value={back} />
            <button className="btn btn-outline" style={{ flex: 1, minHeight: 64, justifyContent: 'center' }}>Salir sin guardar</button>
          </form>
        )}
      </nav>
      {rest && restOpen && (
        <RestModal rest={rest} now={now} pipOk={pipOk} onClose={() => setRestOpen(false)} onSkip={() => { stopRest(); setRestOpen(false); }} onAsk={askNotifications} />
      )}
      {note && <NoteSheet context={`Sesión ${corta(date)} · ${it.name}`} onClose={() => setNote(false)} />}
    </main>
  );
}

const REST_OPTIONS = [60, 90, 120, 150, 180];

/** "Descanso entre series": 1:30 por defecto, se puede cambiar y queda guardado en el teléfono. */
function RestSetting({ value, pipOk }: { value: number; pipOk: boolean }) {
  const [auto, setAuto] = useState(false);
  useEffect(() => setAuto(pipAuto()), []);
  return (
    <>
    <div className="row" style={{ paddingTop: 14, flexWrap: 'wrap' }}>
      <span className="caption muted">Descanso entre series</span>
      <span role="group" aria-label="Descanso entre series" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <button type="button" className="chip" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => setRestPref(Math.max(15, value - 15))} aria-label="15 segundos menos">−</button>
        <select aria-label="Segundos de descanso" value={REST_OPTIONS.includes(value) ? value : ''} onChange={(e) => e.target.value && setRestPref(Number(e.target.value))}
          style={{ height: 36, padding: '0 8px', border: 0, borderRadius: 4, background: 'var(--cuerda)', fontWeight: 700, fontFamily: 'var(--font-archivo)' }}>
          {!REST_OPTIONS.includes(value) && <option value="">{mmss(value)}</option>}
          {REST_OPTIONS.map((o) => <option key={o} value={o}>{mmss(o)}</option>)}
        </select>
        <button type="button" className="chip" style={{ minHeight: 36, padding: '0 12px' }} onClick={() => setRestPref(Math.min(600, value + 15))} aria-label="15 segundos más">+</button>
      </span>
    </div>
    {pipOk && (
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, paddingTop: 10, fontSize: 14 }}>
        <input type="checkbox" checked={auto} onChange={(e) => { setAuto(e.target.checked); setPipAuto(e.target.checked); if (!e.target.checked) closePip(); }}
          style={{ width: 20, height: 20, accentColor: 'var(--violeta)' }} />
        <span>Ventanita flotante en cada descanso <span className="caption muted" style={{ display: 'block' }}>Se ve arriba de cualquier app, como el timer de la bici.</span></span>
      </label>
    )}
    </>
  );
}

function ExpandIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M2.5 7V2.5H7M11 2.5h4.5V7M15.5 11v4.5H11M7 15.5H2.5V11" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function NoteIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path d="M4 3h9l3 3v11H4z" stroke="var(--violeta-texto)" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M7 9h6M7 12.5h4" stroke="var(--violeta-texto)" strokeWidth="1.8" />
    </svg>
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
    const t = setInterval(() => setNow(Date.now()), 200);
    return () => { clearInterval(t); };
  }, [run]);

  const left = run ? Math.max(0, Math.ceil((run.end - now) / 1000)) : 0;
  useEndingTicks(run ? (run.end - now) / 1000 : null, !!run, run ? `t${run.row}-${run.end}` : '-');
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
                  color: running ? (isEnding(left) ? 'var(--alerta)' : 'var(--violeta-texto)') : pending ? 'var(--campana)' : 'var(--guante)' }} />
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
