'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Close } from '@/components/Icons';
import { saveCardio } from '@/app/(app)/sesion/actions';

type Seg = { label: string; min: number };

function bell() {
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AC();
    [0, 0.35].forEach((t) => {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'triangle'; o.frequency.value = 1320;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.5, ctx.currentTime + t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.9);
      o.connect(g).connect(ctx.destination); o.start(ctx.currentTime + t); o.stop(ctx.currentTime + t + 1);
    });
  } catch {}
  try { navigator.vibrate?.([300, 120, 300]); } catch {}
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function TimerRunner({ sessionId, itemId, title, segments }: { sessionId: number; itemId: number; title: string; segments: Seg[] }) {
  const ends = useMemo(() => { let a = 0; return segments.map((s) => (a += s.min * 60)); }, [segments]);
  const total = ends[ends.length - 1] ?? 0;
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const last = useRef<number | null>(null);
  const segRef = useRef(0);
  const saved = useRef(false);

  useEffect(() => {
    if (!running) { last.current = null; return; }
    let lock: any;
    (navigator as any).wakeLock?.request('screen').then((l: any) => (lock = l)).catch(() => {});
    const t = setInterval(() => {
      const now = Date.now();
      if (last.current != null) setElapsed((e) => Math.min(total, e + (now - last.current!) / 1000));
      last.current = now;
    }, 250);
    return () => { clearInterval(t); lock?.release?.(); };
  }, [running, total]);

  const idx = Math.min(segments.length - 1, ends.findIndex((e) => elapsed < e) === -1 ? segments.length - 1 : ends.findIndex((e) => elapsed < e));
  const finished = elapsed >= total && total > 0;

  useEffect(() => {
    if (idx !== segRef.current) { segRef.current = idx; bell(); }
  }, [idx]);
  useEffect(() => {
    if (finished && !saved.current) {
      saved.current = true; setRunning(false); bell();
      saveCardio(sessionId, itemId, Math.round(total / 60)).catch(() => {});
    }
  }, [finished, sessionId, itemId, total]);

  const segStart = idx === 0 ? 0 : ends[idx - 1];
  const left = finished ? 0 : ends[idx] - elapsed;
  const next = segments[idx + 1];
  const jump = (k: number) => { const t = k <= 0 ? 0 : ends[k - 1]; setElapsed(t); segRef.current = Math.max(0, Math.min(segments.length - 1, k)); };

  return (
    <div className="t-oscuro" style={{ minHeight: '100dvh', background: '#0e0e0e', color: '#f5f5f5' }}>
      <main className="app" style={{ background: '#0e0e0e', padding: 'calc(20px + env(safe-area-inset-top)) 24px calc(32px + env(safe-area-inset-bottom))', gap: 28 }}>
        <header className="row">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="label" style={{ color: '#d69ae8' }}>{title}</span>
            <span style={{ fontSize: 14, color: '#a3a3a3' }}>Tramo {idx + 1} de {segments.length}</span>
          </div>
          <Link href={`/sesion/${sessionId}`} className="icon-btn" aria-label="Cerrar el timer" style={{ background: '#2a2a2a', color: '#f5f5f5' }}><Close /></Link>
        </header>

        <section aria-live="polite" style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 16 }}>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 30, letterSpacing: '0.02em', textTransform: 'uppercase', color: '#d69ae8' }}>{finished ? '¡Listo!' : segments[idx].label}</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 'min(112px, 26vw)', lineHeight: 1, letterSpacing: '-0.05em', fontVariantNumeric: 'tabular-nums' }}>{fmt(Math.ceil(left))}</span>
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
              <span className="strong">{next ? `${next.label} ${next.min}′` : 'Terminás'}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, alignItems: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#a3a3a3' }}>TOTAL</span>
              <span className="strong">faltan {fmt(Math.ceil(total - elapsed))}</span>
            </span>
          </div>
          {finished ? (
            <Link href={`/sesion/${sessionId}`} className="btn btn-primary" style={{ background: '#c26bd8', color: '#111' }}>Volver a la sesión</Link>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 40 }}>
              <button type="button" onClick={() => jump(idx === 0 || elapsed - segStart > 3 ? idx : idx - 1)} aria-label="Volver al inicio del tramo" className="icon-btn" style={{ width: 56, height: 56, boxShadow: 'inset 0 0 0 1.5px #3a3a3a', color: '#f5f5f5' }}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M16 4L7 10l9 6z" fill="#f5f5f5" /><rect x="4" y="4" width="2.5" height="12" fill="#f5f5f5" /></svg>
              </button>
              <button type="button" onClick={() => setRunning(!running)} aria-label={running ? 'Pausar' : elapsed > 0 ? 'Seguir' : 'Empezar'} style={{ width: 88, height: 88, borderRadius: 999, border: 0, background: '#c26bd8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {running
                  ? <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><rect x="7" y="5" width="5" height="18" fill="#111" /><rect x="16" y="5" width="5" height="18" fill="#111" /></svg>
                  : <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true"><path d="M8 4l16 10-16 10z" fill="#111" /></svg>}
              </button>
              <button type="button" onClick={() => jump(idx + 1)} disabled={!next} aria-label="Saltar al próximo tramo" className="icon-btn" style={{ width: 56, height: 56, boxShadow: 'inset 0 0 0 1.5px #3a3a3a', opacity: next ? 1 : 0.4 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true"><path d="M4 4l9 6-9 6z" fill="#f5f5f5" /><rect x="13.5" y="4" width="2.5" height="12" fill="#f5f5f5" /></svg>
              </button>
            </div>
          )}
          <p style={{ textAlign: 'center', fontSize: 13, color: '#a3a3a3' }}>Suena la campana y vibra al cambiar de tramo. La pantalla queda encendida.</p>
        </section>
      </main>
    </div>
  );
}
