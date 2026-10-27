'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { bell, unlockAudio } from '@/lib/bell';
import { push, startOutbox } from '@/lib/outbox';
import { openPip, pipSupported } from '@/lib/pip';
import { cardioElapsed, cardioEnds, cardioIdx, mmss, patchTimers, readTimers, stopRest, useTimers, type Timers } from '@/lib/timers';
import { useWakeLock } from '@/lib/wakelock';

/** Lo que muestra la ventanita (PiP): el cronómetro que esté andando. */
export function frameFor(t: Timers, now = Date.now()) {
  if (t.rest) return { title: 'Descanso', big: mmss((t.rest.endsAt - now) / 1000), sub: t.rest.label };
  if (t.cardio && !t.cardio.done) {
    const c = t.cardio; const el = cardioElapsed(c, now); const k = cardioIdx(c, el);
    const left = cardioEnds(c.segments)[k] - el;
    const next = c.segments[k + 1];
    return { title: `${c.segments[k].label} · tramo ${k + 1}/${c.segments.length}`, big: mmss(left), sub: c.since == null ? 'En pausa' : next ? `Después: ${next.label}` : 'Último tramo' };
  }
  return null;
}

export function openTimerPip() {
  return openPip(() => frameFor(readTimers()));
}

/**
 * Motor de los cronómetros (montado en toda la app):
 * hace sonar la campana al terminar el descanso o cambiar de tramo, guarda el cardio al terminar,
 * mantiene la pantalla encendida mientras algo corre y muestra una pastilla arriba
 * cuando estás en otra pantalla.
 */
export default function TimerDock() {
  const path = usePathname() || '';
  const { timers, now } = useTimers(250);
  const [toast, setToast] = useState<string | null>(null);
  const [pipOk, setPipOk] = useState(false);

  useEffect(() => { startOutbox(); unlockAudio(); setPipOk(pipSupported()); }, []);

  const { rest, cardio } = timers;
  const cardioRunning = !!cardio && cardio.since != null && !cardio.done;
  useWakeLock(!!rest || cardioRunning);

  // Fin del descanso
  useEffect(() => {
    if (rest && now >= rest.endsAt) {
      bell();
      stopRest();
      setToast('¡Terminó el descanso! A la próxima serie.');
    }
  }, [rest, now]);

  // Cambio de tramo y fin del cardio
  useEffect(() => {
    if (!cardio || cardio.done || cardio.since == null) return;
    const el = cardioElapsed(cardio, now);
    const total = cardioEnds(cardio.segments).slice(-1)[0] ?? 0;
    if (el >= total && total > 0) {
      bell(3);
      push({ t: 'cardio', s: cardio.sessionId, i: cardio.itemId, minutes: Math.round(total / 60) });
      patchTimers((t) => (t.cardio ? { ...t, cardio: { ...t.cardio, base: total, since: null, done: true, lastIdx: t.cardio.segments.length - 1 } } : t));
      setToast('¡Cardio terminado! Quedó registrado.');
      return;
    }
    const k = cardioIdx(cardio, el);
    if (k !== cardio.lastIdx) {
      bell();
      patchTimers((t) => (t.cardio ? { ...t, cardio: { ...t.cardio, lastIdx: k } } : t));
      setToast(`Cambio de tramo: ${cardio.segments[k].label}`);
    }
  }, [cardio, now]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const showRest = !!rest && path !== `/sesion/${rest.sessionId}`;
  const cardioHref = cardio ? `/timer/${cardio.sessionId}/${cardio.itemId}` : '';
  const showCardio = !!cardio && !cardio.done && (cardio.since != null || cardio.base > 0) && path !== cardioHref;
  const f = frameFor(timers, now);
  const visible = (showRest || showCardio) && !!f;

  // Con la pastilla arriba, bajamos el contenido para que no tape los botones del encabezado
  useEffect(() => {
    document.body.classList.toggle('has-dock', visible);
    return () => document.body.classList.remove('has-dock');
  }, [visible]);

  return (
    <>
      {visible && f && (
        <div className="dock" role="status">
          <Link href={showRest ? `/sesion/${rest!.sessionId}?paso=${rest!.step}` : cardioHref} className="dock-pill">
            <span className="dock-dot" style={{ background: cardioRunning || rest ? 'var(--violeta)' : 'var(--campana)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="dock-title">{f.title}</span>
              <span className="dock-sub">{f.sub}</span>
            </span>
            <span className="dock-time">{f.big}</span>
          </Link>
          {pipOk && (
            <button type="button" className="dock-pip" onClick={() => openTimerPip()} aria-label="Abrir el cronómetro en una ventanita flotante">
              <PipIcon />
            </button>
          )}
        </div>
      )}
      {toast && <div className="toast" role="alert" onClick={() => setToast(null)}>{toast}</div>}
    </>
  );
}

export function PipIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <rect x="2" y="4" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.8" />
      <rect x="10" y="9.5" width="6" height="4.5" rx="0.8" fill="currentColor" />
    </svg>
  );
}
