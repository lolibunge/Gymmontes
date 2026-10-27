'use client';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Close } from '@/components/Icons';
import { openTimerPip, PipIcon } from '@/components/TimerDock';
import { pipSupported } from '@/lib/pip';
import { cardioElapsed, cardioEnds, cardioIdx, patchTimers, useTimers, type CardioTimer } from '@/lib/timers';
import { useWakeLock } from '@/lib/wakelock';

type Seg = { label: string; min: number };

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
/** Duración de un tramo: 20′, 30″ o 1′30″ */
const dur = (min: number) => { const t = Math.round(min * 60); const m = Math.floor(t / 60), sec = t % 60; return m && sec ? `${m}′${sec}″` : m ? `${m}′` : `${sec}″`; };

/**
 * Timer de cardio por tramos. El estado vive en lib/timers (con la hora de inicio guardada en el teléfono),
 * así sigue corriendo si cerrás esta pantalla, refrescás o se bloquea el teléfono, y la campana la toca
 * el motor general (components/TimerDock), que además muestra la pastilla arriba en otras pantallas.
 */
export default function TimerRunner({ sessionId, itemId, title, segments }: { sessionId: number; itemId: number; title: string; segments: Seg[] }) {
  const ends = useMemo(() => cardioEnds(segments), [segments]);
  const total = ends[ends.length - 1] ?? 0;
  const { timers, now } = useTimers(200);
  const [pipOk, setPipOk] = useState(false);
  useEffect(() => setPipOk(pipSupported()), []);
  useWakeLock(true);

  const mine = timers.cardio && timers.cardio.sessionId === sessionId && timers.cardio.itemId === itemId ? timers.cardio : null;
  const fresh: CardioTimer = { sessionId, itemId, title, segments, base: 0, since: null, lastIdx: 0, done: false };
  const c = mine ?? fresh;
  const running = c.since != null && !c.done;
  const elapsed = cardioElapsed(c, now);
  const finished = c.done || (elapsed >= total && total > 0);
  const idx = Math.min(segments.length - 1, cardioIdx(c, elapsed));

  function set(next: Partial<CardioTimer>) {
    patchTimers((t) => {
      const cur = t.cardio && t.cardio.sessionId === sessionId && t.cardio.itemId === itemId ? t.cardio : fresh;
      return { ...t, cardio: { ...cur, title, segments, ...next } };
    });
  }
  const toggle = () => (running ? set({ base: elapsed, since: null }) : set({ since: Date.now(), base: elapsed, lastIdx: idx }));
  const jump = (k: number) => {
    const kk = Math.max(0, Math.min(segments.length - 1, k));
    const t = kk <= 0 ? 0 : ends[kk - 1];
    set({ base: t, since: running ? Date.now() : null, lastIdx: kk });
  };

  const segStart = idx === 0 ? 0 : ends[idx - 1];
  const left = finished ? 0 : ends[idx] - elapsed;
  const next = segments[idx + 1];

  return (
    <div className="t-oscuro" style={{ minHeight: '100dvh', background: '#0e0e0e', color: '#f5f5f5' }}>
      <main className="app" style={{ background: '#0e0e0e', padding: 'calc(20px + env(safe-area-inset-top)) 24px calc(32px + env(safe-area-inset-bottom))', gap: 28 }}>
        <header className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="label" style={{ color: '#d69ae8' }}>{title}</span>
            <span style={{ fontSize: 14, color: '#a3a3a3' }}>Tramo {idx + 1} de {segments.length}</span>
          </div>
          <span style={{ display: 'flex', gap: 8 }}>
            {pipOk && !finished && (
              <button type="button" onClick={() => openTimerPip()} className="icon-btn" aria-label="Ver el timer en una ventanita flotante" style={{ background: '#2a2a2a', color: '#f5f5f5' }}><PipIcon /></button>
            )}
            <Link href={`/sesion/${sessionId}`} className="icon-btn" aria-label={running ? 'Cerrar el timer (sigue corriendo)' : 'Cerrar el timer'} style={{ background: '#2a2a2a', color: '#f5f5f5' }}><Close /></Link>
          </span>
        </header>

        <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16 }}>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 30, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#d69ae8' }}>{finished ? '¡Listo!' : segments[idx].label}</span>
          {(() => {
            const t = Math.ceil(left);
            const big: React.CSSProperties = { fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 'min(112px, 26vw)', lineHeight: 1, letterSpacing: '-0.04em', fontVariantNumeric: 'tabular-nums' };
            const unit: React.CSSProperties = { fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', color: '#a3a3a3', paddingLeft: 4 };
            return (
              <span role="timer" aria-label={`${Math.floor(t / 60)} minutos ${t % 60} segundos`} style={{ display: 'flex', alignItems: 'flex-start' }}>
                <span style={{ display: 'flex', flexDirection: 'column' }}><span style={big}>{String(Math.floor(t / 60)).padStart(2, '0')}</span><span style={unit}>MIN</span></span>
                <span style={{ ...big, padding: '0 2px', opacity: running ? 1 : 0.5 }}>:</span>
                <span style={{ display: 'flex', flexDirection: 'column' }}><span style={big}>{String(t % 60).padStart(2, '0')}</span><span style={unit}>SEG</span></span>
              </span>
            );
          })()}
          <span style={{ fontSize: 15, color: '#a3a3a3' }}>{finished ? 'Cardio registrado en tu sesión.' : 'quedan de este tramo'}</span>
        </section>

        <section aria-label="Tramos" style={{ display: 'flex', gap: 4, height: 12 }}>
          {segments.map((s, k) => {
            const segS = k === 0 ? 0 : ends[k - 1];
            const pct = Math.max(0, Math.min(1, (elapsed - segS) / (s.min * 60)));
            return (
              <span key={k} style={{ flex: s.min, display: 'flex', background: '#2a2a2a' }}>
                <span style={{ width: `${pct * 100}%`, background: k === idx && !finished ? '#d69ae8' : '#c26bd8' }} />
              </span>
            );
          })}
        </section>

        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', gap: 28 }}>
          <div className="row" style={{ padding: '16px 0', borderTop: '1px solid #2a2a2a', borderBottom: '1px solid #2a2a2a' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#a3a3a3' }}>DESPUÉS</span>
              <span className="strong">{next ? `${next.label} ${dur(next.min)}` : 'Terminás'}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#a3a3a3' }}>TOTAL</span>
              <span className="strong" style={{ fontVariantNumeric: 'tabular-nums' }}>{fmt(Math.floor(elapsed))} de {fmt(total)}</span>
            </span>
          </div>
          {finished ? (
            <Link href={`/sesion/${sessionId}`} className="btn btn-primary" style={{ background: '#c26bd8', color: '#111' }}>Volver a la sesión</Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
              <button type="button" onClick={() => jump(idx === 0 || elapsed - segStart > 3 ? idx : idx - 1)} aria-label="Volver al inicio del tramo" className="icon-btn" style={{ width: 56, height: 56, boxShadow: 'inset 0 0 0 1.5px #3a3a3a', color: '#f5f5f5' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 4L7 10l9 6z" fill="#f5f5f5" /><rect x="4" y="4" width="2.5" height="12" fill="#f5f5f5" /></svg>
              </button>
              <button type="button" onClick={toggle} aria-label={running ? 'Pausar' : elapsed > 0 ? 'Seguir' : 'Empezar'} style={{ width: 88, height: 88, borderRadius: 999, border: 0, background: '#c26bd8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {running
                  ? <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="7" y="5" width="5" height="18" fill="#111" /><rect x="16" y="5" width="5" height="18" fill="#111" /></svg>
                  : <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M8 4l16 10-16 10z" fill="#111" /></svg>}
              </button>
              <button type="button" onClick={() => jump(idx + 1)} disabled={!next} aria-label="Saltar al próximo tramo" className="icon-btn" style={{ width: 56, height: 56, boxShadow: 'inset 0 0 0 1.5px #3a3a3a', opacity: next ? 1 : 0.4 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l9 6-9 6z" fill="#f5f5f5" /><rect x="13.5" y="4" width="2.5" height="12" fill="#f5f5f5" /></svg>
              </button>
            </div>
          )}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#a3a3a3' }}>Suena la campana y vibra al cambiar de tramo. La pantalla queda encendida. Si salís de esta pantalla, el timer sigue y lo ves arriba.</p>
        </section>
      </main>
    </div>
  );
}
