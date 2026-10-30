'use client';
import { Check } from '@/components/Icons';
import { openTimerPip } from '@/components/TimerDock';
import { pipAuto, pipOpen, pipSupported } from '@/lib/pip';
import { ENDING_RED, isEnding, mmss, useTimers, warmGo, warmLeft, warmPause, warmStop } from '@/lib/timers';
import type { WarmStep } from '@/lib/warmup';

/**
 * Calentamiento o enfriamiento guiado: un paso por vez, con su tiempo. Suena al cambiar de paso.
 * El estado vive en lib/timers (guardado en el teléfono): si vas para atrás, refrescás o te vas
 * a otra app, sigue donde estaba, se ve en la pastilla y en la ventanita flotante, y avisa.
 */
export default function WarmPanel({ sessionId, kind, steps, status, onDone }: {
  sessionId: number; kind: 'calentamiento' | 'enfriamiento'; steps: WarmStep[]; status?: 'hecho' | 'salteado';
  onDone: (s: 'hecho' | 'salteado') => void;
}) {
  const { timers, now } = useTimers(200);
  const w = timers.warm && timers.warm.sessionId === sessionId && timers.warm.kind === kind ? timers.warm : null;
  const k = w ? w.k : -1; // -1 = sin empezar
  const cur = steps[k];
  const left = w ? warmLeft(w, now) : null;
  const finished = k >= steps.length;
  const total = steps.reduce((a, s) => a + (s.s ?? 0), 0);
  const base = { sessionId, kind, steps };

  function start(n: number) {
    // Ventanita flotante (si la usás en los descansos), así lo ves desde cualquier app
    if (n === 0 && pipAuto() && pipSupported() && !pipOpen()) openTimerPip().catch(() => {});
    warmGo(base, n);
  }
  function done(st: 'hecho' | 'salteado') { warmStop(); onDone(st); }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <span className="label brand">{kind === 'calentamiento' ? 'Antes de empezar' : 'Para terminar'}</span>
      <h1 className="title">{kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'}</h1>
      <p className="caption muted">
        {total > 0 ? `Unos ${Math.max(1, Math.round(total / 60))} minutos. ` : ''}
        {status === 'hecho' ? 'Ya lo hiciste hoy ✓' : status === 'salteado' ? 'Lo salteaste. Podés hacerlo igual.' : kind === 'calentamiento' ? 'Prepará el cuerpo para entrenar. Si ya calentaste, salteálo.' : 'Bajá las pulsaciones y estirá lo que trabajaste.'}
      </p>

      {w && !finished && cur && (
        <div className="card bg-esquina" style={{ gap: 8, padding: 18 }}>
          <span className="label" style={{ color: '#d69ae8' }}>Paso {k + 1} de {steps.length}</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{cur.name}</span>
          {left != null && (
            <span role="timer" style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 56, lineHeight: 1, fontVariantNumeric: 'tabular-nums', color: w.endsAt != null && isEnding(left) ? ENDING_RED : undefined }}>{mmss(left)}</span>
          )}
          <div style={{ display: 'flex', gap: 8 }}>
            {cur.s != null && (
              <button type="button" className="btn btn-outline" style={{ flex: 1, color: '#f5f5f5', boxShadow: 'inset 0 0 0 1.5px #5a5a5a', minHeight: 48, fontSize: 14 }} onClick={warmPause}>
                {w.endsAt != null ? 'Pausar' : 'Seguir'}
              </button>
            )}
            <button type="button" className="btn btn-primary" style={{ flex: 1, minHeight: 48, fontSize: 14, justifyContent: 'center' }} onClick={() => warmGo(base, k + 1)}>
              {cur.s == null ? 'Listo' : 'Siguiente'}
            </button>
          </div>
        </div>
      )}

      <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {steps.map((st, n) => {
          const isDone = finished || n < k;
          const on = n === k;
          return (
            <li key={n} className="warm-step" style={{ opacity: isDone ? 0.55 : 1 }}>
              <span style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800,
                background: isDone ? 'var(--violeta)' : on ? 'var(--guante)' : 'var(--cuerda)', color: isDone ? 'var(--on-violeta)' : on ? 'var(--lona)' : 'var(--campana)' }}>
                {isDone ? <Check size={14} /> : n + 1}
              </span>
              <span style={{ flex: 1, fontWeight: on ? 700 : 500 }}>{st.name}</span>
              {st.s != null && <span className="caption muted">{st.s >= 60 && st.s % 60 === 0 ? `${st.s / 60} min` : mmss(st.s)}</span>}
            </li>
          );
        })}
      </ol>

      {finished ? (
        <button type="button" className="btn btn-primary" onClick={() => done('hecho')}>{kind === 'calentamiento' ? 'Empezar los ejercicios' : 'Terminar sesión'} <span aria-hidden="true">→</span></button>
      ) : !w ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => done('salteado')}>{kind === 'calentamiento' ? 'Saltear' : 'Saltear y terminar'}</button>
          <button type="button" className="btn btn-primary" style={{ flex: 1.4 }} onClick={() => start(0)}>Empezar <span aria-hidden="true">▶</span></button>
        </div>
      ) : (
        <button type="button" className="link" style={{ alignSelf: 'center' }} onClick={() => done('salteado')}>Saltear el resto</button>
      )}
    </section>
  );
}
