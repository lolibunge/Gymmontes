'use client';
import { useEffect, useRef, useState } from 'react';

/**
 * Cronómetros que siguen corriendo aunque cambies de pantalla:
 * - rest: el descanso entre series.
 * - cardio: el timer por tramos de la bici.
 * Se guardan en el teléfono con la hora de inicio, así refrescar o salir y volver no los corta.
 * El motor (components/TimerDock.tsx) los hace sonar y muestra la ventanita.
 */

export type Seg = { label: string; min: number };
export type RestTimer = { sessionId: number; step: number; label: string; endsAt: number; total: number; startedAt: number; next?: string };
export type CardioTimer = {
  sessionId: number; itemId: number; title: string; segments: Seg[];
  base: number; since: number | null; lastIdx: number; done: boolean;
};
/** Calentamiento / enfriamiento guiado. k = paso actual (k = steps.length: terminado). */
export type WarmTimer = {
  sessionId: number; kind: 'calentamiento' | 'enfriamiento'; steps: { name: string; s: number | null }[];
  k: number; endsAt: number | null; paused: number | null;
};
export type Timers = { rest: RestTimer | null; cardio: CardioTimer | null; warm: WarmTimer | null };

const KEY = 'gm-timers';
const EVT = 'gm-timers';
const REST_KEY = 'gm-rest-s';
export const DEFAULT_REST = 90;

export function readTimers(): Timers {
  try { return { rest: null, cardio: null, warm: null, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return { rest: null, cardio: null, warm: null }; }
}
export function writeTimers(t: Timers) {
  try { localStorage.setItem(KEY, JSON.stringify(t)); } catch {}
  window.dispatchEvent(new Event(EVT));
}
export function patchTimers(f: (t: Timers) => Timers) { writeTimers(f(readTimers())); }

/** Segundos de descanso elegidos por la socia (1:30 si nunca lo cambió). */
export function restPref(): number {
  try { const n = Number(localStorage.getItem(REST_KEY)); return n >= 15 && n <= 600 ? n : DEFAULT_REST; } catch { return DEFAULT_REST; }
}
export function setRestPref(s: number) {
  try { localStorage.setItem(REST_KEY, String(s)); } catch {}
  window.dispatchEvent(new Event(EVT));
}

/** `next`: lo que viene después, ej. "Serie 2 de 3 · 40 kg × 12". */
export function startRest(sessionId: number, step: number, label: string, next?: string) {
  const total = restPref();
  const now = Date.now();
  patchTimers((t) => ({ ...t, rest: { sessionId, step, label, next, total, startedAt: now, endsAt: now + total * 1000 } }));
}
/** Sumar o restar segundos solo al descanso en curso (el de siempre se cambia abajo, en "Descanso entre series"). */
export function adjustRest(delta: number) {
  patchTimers((t) => {
    if (!t.rest) return t;
    const endsAt = Math.max(Date.now() + 1000, t.rest.endsAt + delta * 1000);
    return { ...t, rest: { ...t.rest, endsAt, total: Math.max(1, t.rest.total + delta) } };
  });
}
export function stopRest() { patchTimers((t) => ({ ...t, rest: null })); }

/* ---------- cardio ---------- */
export function cardioEnds(segments: Seg[]) { let a = 0; return segments.map((s) => (a += s.min * 60)); }
export function cardioElapsed(c: CardioTimer, now = Date.now()) {
  const total = cardioEnds(c.segments).slice(-1)[0] ?? 0;
  return Math.min(total, c.base + (c.since != null ? (now - c.since) / 1000 : 0));
}
export function cardioIdx(c: CardioTimer, elapsed: number) {
  const ends = cardioEnds(c.segments);
  const k = ends.findIndex((e) => elapsed < e);
  return k === -1 ? c.segments.length - 1 : k;
}

/** Re-render cada `ms` mientras haya algún cronómetro andando, y cada vez que cambian. */
export function useTimers(ms = 250) {
  const [t, setT] = useState<Timers>({ rest: null, cardio: null, warm: null });
  const [now, setNow] = useState(0);
  const [pref, setPref] = useState(DEFAULT_REST);
  useEffect(() => {
    const sync = () => { setT(readTimers()); setPref(restPref()); setNow(Date.now()); };
    sync();
    const onStorage = (e: StorageEvent) => { if (e.key === KEY || e.key === REST_KEY) sync(); };
    window.addEventListener(EVT, sync);
    window.addEventListener('storage', onStorage);
    document.addEventListener('visibilitychange', sync);
    return () => { window.removeEventListener(EVT, sync); window.removeEventListener('storage', onStorage); document.removeEventListener('visibilitychange', sync); };
  }, []);
  const active = !!t.rest || !!(t.cardio && t.cardio.since != null) || !!t.warm?.endsAt;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [active, ms]);
  return { timers: t, now: now || Date.now(), restPref: pref };
}

export const mmss = (s: number) => { const t = Math.max(0, Math.ceil(s)); return `${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`; };

/** Últimos segundos de una cuenta regresiva: números en rojo y un tic por segundo. */
export const ENDING_S = 5;
export const ENDING_RED = '#ff453a';
export const isEnding = (left: number | null | undefined) => left != null && left > 0 && Math.ceil(left) <= ENDING_S;

/**
 * Suena un tic en cada uno de los últimos 5 segundos (5, 4, 3, 2, 1).
 * `key` identifica la cuenta (si cambia, vuelve a sonar). Solo con la app en pantalla.
 */
export function useEndingTicks(left: number | null | undefined, running: boolean, key: string | number) {
  const last = useRef<{ key: string | number; s: number } | null>(null);
  useEffect(() => {
    if (!running || left == null || left <= 0) return;
    const s = Math.ceil(left);
    if (s > ENDING_S) return;
    if (last.current && last.current.key === key && last.current.s === s) return;
    last.current = { key, s };
    const pip = (document as any).pictureInPictureElement;
    if (document.visibilityState === 'visible' || pip) import('./bell').then((b) => b.tick(s === 1));
  });
}

/* ---------- calentamiento / enfriamiento ---------- */
/** Arranca (o salta a) el paso n. Si el paso no tiene tiempo, queda esperando que toques "Listo". */
export function warmGo(base: Omit<WarmTimer, 'k' | 'endsAt' | 'paused'>, n: number) {
  const s = base.steps[n]?.s ?? null;
  patchTimers((t) => ({ ...t, warm: { ...base, k: n, endsAt: n < base.steps.length && s ? Date.now() + s * 1000 : null, paused: null } }));
}
export function warmPause() {
  patchTimers((t) => {
    const w = t.warm; if (!w) return t;
    if (w.endsAt != null) return { ...t, warm: { ...w, paused: Math.max(0, (w.endsAt - Date.now()) / 1000), endsAt: null } };
    if (w.paused != null) return { ...t, warm: { ...w, endsAt: Date.now() + w.paused * 1000, paused: null } };
    return t;
  });
}
export function warmStop() { patchTimers((t) => ({ ...t, warm: null })); }
export const warmLeft = (w: WarmTimer, now = Date.now()) => (w.endsAt != null ? Math.max(0, (w.endsAt - now) / 1000) : w.paused);
