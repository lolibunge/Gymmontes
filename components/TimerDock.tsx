'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { bell, unlockAudio } from '@/lib/bell';
import { push, startOutbox } from '@/lib/outbox';
import { closePip, openPip, pipOpen, pipSupported, setPipAuto } from '@/lib/pip';
import { cardioElapsed, cardioEnds, cardioIdx, isEnding, mmss, patchTimers, readTimers, stopRest, useEndingTicks, useTimers, warmGo, warmLeft, type Timers } from '@/lib/timers';
import { useWakeLock } from '@/lib/wakelock';
import { cancelPlan, sendPlan, type BgPlan } from '@/lib/bgnotify';

const hhmm = (t: number) => new Date(t).toLocaleTimeString('es-UY', { hour: '2-digit', minute: '2-digit', hour12: false });
const durTxt = (min: number) => { const t = Math.round(min * 60); const m = Math.floor(t / 60), s = t % 60; return m && s ? `${m}′${s}″` : m ? `${m}′` : `${s}″`; };

/** Qué avisar si salís de la app: notificación fija + avisos a la hora justa. */
export function planFor(t: Timers, now = Date.now()): BgPlan | null {
  if (t.rest && t.rest.endsAt > now) {
    return {
      ongoing: { title: `Descanso · termina ${hhmm(t.rest.endsAt)}`, body: t.rest.label },
      alerts: [{ at: t.rest.endsAt, title: '¡Terminó el descanso!', body: t.rest.next ? `A la próxima serie: ${t.rest.next}` : 'A la próxima serie' }],
    };
  }
  const w = t.warm;
  if (w && w.endsAt != null && w.endsAt > now) {
    // Avisos al terminar cada paso con tiempo (se corta en el primero que se marca a mano)
    const alerts = [];
    let at = w.endsAt;
    for (let n = w.k + 1; ; n++) {
      const st = w.steps[n];
      alerts.push(st ? { at, title: `${w.kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'}: ${st.name}`, body: st.s ? `Paso ${n + 1} de ${w.steps.length} · ${mmss(st.s)}` : `Paso ${n + 1} de ${w.steps.length} · tocá Listo al terminar` }
        : { at, title: `¡${w.kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'} terminado!`, body: 'Volvé a la app para seguir.' });
      if (!st || !st.s) break;
      at += st.s * 1000;
    }
    return { ongoing: { title: `${w.steps[w.k].name} · termina ${hhmm(w.endsAt)}`, body: `${w.kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'} · paso ${w.k + 1} de ${w.steps.length}` }, alerts };
  }
  const c = t.cardio;
  if (c && !c.done && c.since != null) {
    const el = cardioElapsed(c, now);
    const ends = cardioEnds(c.segments);
    const start = now - el * 1000;
    const k = cardioIdx(c, el);
    const alerts = ends.slice(k).map((e, j) => {
      const nk = k + j + 1;
      const next = c.segments[nk];
      return next
        ? { at: start + e * 1000, title: `Cambio de tramo: ${next.label}`, body: `${durTxt(next.min)} · tramo ${nk + 1} de ${c.segments.length}` }
        : { at: start + e * 1000, title: '¡Cardio terminado!', body: 'Volvé a la app para seguir con la sesión.' };
    });
    return { ongoing: { title: `${c.segments[k].label} · tramo ${k + 1}/${c.segments.length}`, body: `Cambia a las ${hhmm(start + ends[k] * 1000)}` }, alerts };
  }
  return null;
}

/** Lo que muestra la ventanita (PiP): el cronómetro que esté andando. */
export function frameFor(t: Timers, now = Date.now()) {
  if (t.rest) { const l = (t.rest.endsAt - now) / 1000; return { title: 'Descanso', big: mmss(l), sub: t.rest.next ? `Sigue: ${t.rest.next}` : t.rest.label, red: isEnding(l) }; }
  if (t.warm && t.warm.k < t.warm.steps.length && (t.warm.endsAt != null || t.warm.paused != null || t.warm.steps[t.warm.k]?.s == null)) {
    const w = t.warm; const l = warmLeft(w, now); const st = w.steps[w.k]; const nx = w.steps[w.k + 1];
    return {
      title: `${w.kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'} · ${w.k + 1}/${w.steps.length}`,
      big: l != null ? mmss(l) : '✓ Listo', sub: l == null ? `${st.name}: tocá Listo` : w.endsAt == null ? `En pausa · ${st.name}` : nx ? `${st.name} · después: ${nx.name}` : st.name,
      red: w.endsAt != null && isEnding(l),
    };
  }
  if (t.cardio && !t.cardio.done) {
    const c = t.cardio; const el = cardioElapsed(c, now); const k = cardioIdx(c, el);
    const left = cardioEnds(c.segments)[k] - el;
    const next = c.segments[k + 1];
    return { title: `${c.segments[k].label} · tramo ${k + 1}/${c.segments.length}`, big: mmss(left), sub: c.since == null ? 'En pausa' : next ? `Después: ${next.label}` : 'Último tramo', red: c.since != null && isEnding(left) };
  }
  return null;
}

/**
 * Abre la ventanita flotante. Queda abierta toda la sesión: entre descansos muestra "A entrenar"
 * y en cuanto marcás la próxima serie vuelve a mostrar la cuenta regresiva.
 */
export function openTimerPip() {
  setPipAuto(true);
  return openPip(() => frameFor(readTimers()) ?? { title: 'GYM MONTES', big: '¡Dale!', sub: 'Marcá la serie y arranca el descanso' });
}
export { closePip };

/** Se puede sonar si la app está en pantalla o si la ventanita flotante está abierta. */
const audible = () => document.visibilityState === 'visible' || pipOpen();

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

  // Al irte de la app con un cronómetro andando: avisos del sistema (y se renuevan cada 30 s)
  useEffect(() => {
    let id: ReturnType<typeof setInterval> | null = null;
    const send = () => { const p = planFor(readTimers()); if (p) sendPlan(p); else { cancelPlan(); if (id) { clearInterval(id); id = null; } } };
    const onVis = () => {
      if (document.visibilityState === 'hidden') { send(); if (!id) id = setInterval(send, 30000); }
      else { if (id) { clearInterval(id); id = null; } cancelPlan(); }
    };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('pagehide', send);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('pagehide', send); if (id) clearInterval(id); };
  }, []);

  const { rest, cardio } = timers;
  const cardioRunning = !!cardio && cardio.since != null && !cardio.done;
  useWakeLock(!!rest || cardioRunning || !!timers.warm?.endsAt);

  // Últimos 5 segundos: un tic por segundo (descanso y cada tramo de la bici)
  const restLeft = rest ? (rest.endsAt - now) / 1000 : null;
  useEndingTicks(restLeft, !!rest, rest ? `r${rest.startedAt}` : '-');
  const cEl = cardio ? cardioElapsed(cardio, now) : 0;
  const cIdx = cardio ? cardioIdx(cardio, cEl) : 0;
  const cardioLeft = cardio && cardioRunning ? cardioEnds(cardio.segments)[cIdx] - cEl : null;
  useEndingTicks(cardioLeft, cardioRunning, `c${cardio?.itemId}-${cIdx}`);

  // Calentamiento / enfriamiento: tic en los últimos 5 s y pasar solo al paso siguiente
  const warm = timers.warm;
  const wLeft = warm?.endsAt != null ? (warm.endsAt - now) / 1000 : null;
  useEndingTicks(wLeft, warm?.endsAt != null, warm ? `w${warm.kind}${warm.k}-${warm.endsAt}` : '-');
  useEffect(() => {
    if (!warm || warm.endsAt == null || now < warm.endsAt) return;
    const next = warm.k + 1;
    if (audible()) bell(next >= warm.steps.length ? 3 : 2);
    if (next < warm.steps.length) setToast(`Siguiente: ${warm.steps[next].name}`);
    else setToast(`¡${warm.kind === 'calentamiento' ? 'Calentamiento' : 'Enfriamiento'} terminado!`);
    warmGo({ sessionId: warm.sessionId, kind: warm.kind, steps: warm.steps }, next);
  }, [warm, now]);

  // Fin del descanso
  useEffect(() => {
    if (rest && now >= rest.endsAt) {
      if (audible()) bell();
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
      if (audible()) bell(3);
      push({ t: 'cardio', s: cardio.sessionId, i: cardio.itemId, minutes: Math.round(total / 60) });
      patchTimers((t) => (t.cardio ? { ...t, cardio: { ...t.cardio, base: total, since: null, done: true, lastIdx: t.cardio.segments.length - 1 } } : t));
      setToast('¡Cardio terminado! Quedó registrado.');
      return;
    }
    const k = cardioIdx(cardio, el);
    if (k !== cardio.lastIdx) {
      if (audible()) bell();
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
  const w2 = timers.warm;
  const showWarm = !rest && !!w2 && w2.k < w2.steps.length && path !== `/sesion/${w2.sessionId}`;
  const cardioHref = cardio ? `/timer/${cardio.sessionId}/${cardio.itemId}` : '';
  const showCardio = !!cardio && !cardio.done && (cardio.since != null || cardio.base > 0) && path !== cardioHref;
  const f = frameFor(timers, now);
  const visible = (showRest || showWarm || showCardio) && !!f;

  // Con la pastilla arriba, bajamos el contenido para que no tape los botones del encabezado
  useEffect(() => {
    document.body.classList.toggle('has-dock', visible);
    return () => document.body.classList.remove('has-dock');
  }, [visible]);

  return (
    <>
      {visible && f && (
        <div className="dock" role="status">
          <Link href={showRest ? `/sesion/${rest!.sessionId}?paso=${rest!.step}` : showWarm ? `/sesion/${w2!.sessionId}?paso=${w2!.kind === 'calentamiento' ? -1 : 99}` : cardioHref} className="dock-pill">
            <span className="dock-dot" style={{ background: cardioRunning || rest || w2?.endsAt ? 'var(--violeta)' : 'var(--campana)' }} />
            <span style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
              <span className="dock-title">{f.title}</span>
              <span className="dock-sub">{f.sub}</span>
            </span>
            <span className="dock-time" style={f.red ? { color: '#ff453a' } : undefined}>{f.big}</span>
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
