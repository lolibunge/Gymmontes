'use client';
import { useEffect, useRef, useState } from 'react';
import { bell } from '@/lib/bell';
import { Check } from '@/components/Icons';
import { mmss } from '@/lib/timers';
import type { WarmStep } from '@/lib/warmup';

/**
 * Calentamiento o enfriamiento guiado: un paso por vez, con su tiempo. Suena al cambiar de paso.
 * Se puede saltear todo, saltear un paso o hacerlo sin timer.
 */
export default function WarmPanel({ kind, steps, status, onDone }: {
  kind: 'calentamiento' | 'enfriamiento'; steps: WarmStep[]; status?: 'hecho' | 'salteado';
  onDone: (s: 'hecho' | 'salteado') => void;
}) {
  const [k, setK] = useState(-1); // -1 = sin empezar
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [paused, setPaused] = useState<number | null>(null); // segundos que quedaban al pausar
  const [now, setNow] = useState(Date.now());
  const fired = useRef(-1);
  const total = steps.reduce((a, s) => a + (s.s ?? 0), 0);
  const cur = steps[k];

  useEffect(() => {
    if (endsAt == null) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [endsAt]);

  function startStep(n: number) {
    if (n >= steps.length) { bell(3); setK(steps.length); setEndsAt(null); return; }
    setK(n); setPaused(null);
    const s = steps[n].s;
    setEndsAt(s ? Date.now() + s * 1000 : null);
    setNow(Date.now());
  }

  const left = endsAt != null ? Math.max(0, (endsAt - now) / 1000) : paused;
  useEffect(() => {
    if (endsAt != null && left === 0 && fired.current !== k) {
      fired.current = k;
      bell();
      startStep(k + 1);
    }
  });

  const finished = k >= steps.length;
  const title = kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento';

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span className="label brand">{kind === 'calentamiento' ? 'Antes de empezar' : 'Para terminar'}</span>
      <h1 className="title">{title}</h1>
      <p className="caption muted">
        {total > 0 ? `Unos ${Math.max(1, Math.round(total / 60))} minutos. ` : ''}
        {status === 'hecho' ? 'Ya lo hiciste hoy ✓' : status === 'salteado' ? 'Lo salteaste. Podés hacerlo igual.' : kind === 'calentamiento' ? 'Prepará el cuerpo para entrenar. Si ya calentaste, salteálo.' : 'Bajá las pulsaciones y estirá lo que trabajaste.'}
      </p>

      {k >= 0 && !finished && cur && (
        <div className="card bg-esquina" style={{ gap: 8, padding: 18 }}>
          <span className="label" style={{ color: '#d69ae8' }}>Paso {k + 1} de {steps.length}</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{cur.name}</span>
          {left != null && <span role="timer" style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 56, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{mmss(left)}</span>}
          <div style={{ display: 'flex', gap: 8 }}>
            {cur.s != null && (
              <button type="button" className="btn btn-outline" style={{ flex: 1, color: '#f5f5f5', boxShadow: 'inset 0 0 0 1.5px #5a5a5a', minHeight: 48, fontSize: 14 }}
                onClick={() => {
                  if (endsAt != null) { setPaused(Math.max(0, (endsAt - Date.now()) / 1000)); setEndsAt(null); }
                  else if (paused != null) { setEndsAt(Date.now() + paused * 1000); setPaused(null); setNow(Date.now()); }
                }}>{endsAt != null ? 'Pausar' : 'Seguir'}</button>
            )}
            <button type="button" className="btn btn-primary" style={{ flex: 1, minHeight: 48, fontSize: 14, justifyContent: 'center' }} onClick={() => startStep(k + 1)}>
              {cur.s == null ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </div>
      )}

      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((st, n) => {
          const done = finished || n < k;
          const on = n === k;
          return (
            <li key={n} className="warm-step" style={{ opacity: done ? 0.55 : 1 }}>
              <span style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
                background: done ? 'var(--violeta)' : on ? 'var(--guante)' : 'var(--cuerda)', color: done ? 'var(--on-violeta)' : on ? 'var(--lona)' : 'var(--campana)' }}>
                {done ? <Check size={14} /> : n + 1}
              </span>
              <span style={{ flex: 1, fontWeight: on ? 700 : 500 }}>{st.name}</span>
              {st.s != null && <span className="caption muted">{st.s >= 60 && st.s % 60 === 0 ? `${st.s / 60} min` : mmss(st.s)}</span>}
            </li>
          );
        })}
      </ol>

      {finished ? (
        <button type="button" className="btn btn-primary" onClick={() => onDone('hecho')}>{kind === 'calentamiento' ? 'Empezar los ejercicios' : 'Terminar sesión'} <span aria-hidden="true">→</span></button>
      ) : k < 0 ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => onDone('salteado')}>{kind === 'calentamiento' ? 'Saltear' : 'Saltear y terminar'}</button>
          <button type="button" className="btn btn-primary" style={{ flex: 1.4 }} onClick={() => startStep(0)}>Empezar <span aria-hidden="true">▶</span></button>
        </div>
      ) : (
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => onDone('salteado')}>Saltear el resto</button>
      )}
    </section>
  );
}
