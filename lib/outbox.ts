'use client';
/**
 * Guardado local primero: cada cambio de la sesión (kg, reps, serie hecha, cómo resultó el peso, cardio)
 * queda en el teléfono (localStorage) y se manda al servidor en segundo plano.
 * Si no hay señal, se reintenta solo. Así no se pierde nada al refrescar, ir para atrás o quedarse sin conexión,
 * y los toques no esperan a la red.
 */

export type SetOp = { t: 'set'; s: number; i: number; n: number; kg: number | null; reps: number | null; done: boolean };
export type FeelOp = { t: 'feel'; s: number; i: number; feel: 'liviano' | 'justo' | 'pesado' | null };
export type CardioOp = { t: 'cardio'; s: number; i: number; minutes: number };
export type Op = SetOp | FeelOp | CardioOp;

const KEY = 'gm-outbox';
const listeners = new Set<(n: number) => void>();

function opKey(o: Op) {
  return o.t === 'set' ? `set:${o.s}:${o.i}:${o.n}` : `${o.t}:${o.s}:${o.i}`;
}

function read(): Op[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
}
function write(ops: Op[]) {
  try { localStorage.setItem(KEY, JSON.stringify(ops)); } catch {}
  listeners.forEach((f) => f(ops.length));
}

export function pendingCount(sessionId?: number) {
  const ops = read();
  return sessionId == null ? ops.length : ops.filter((o) => o.s === sessionId).length;
}

export function onPending(f: (n: number) => void) {
  listeners.add(f);
  return () => { listeners.delete(f); };
}

let timer: ReturnType<typeof setTimeout> | null = null;

/** Agrega (o reemplaza) un cambio y programa el envío. */
export function push(op: Op) {
  const k = opKey(op);
  const ops = read().filter((o) => opKey(o) !== k);
  ops.push(op);
  write(ops);
  schedule(400);
}

function schedule(ms: number) {
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => { flush().catch(() => {}); }, ms);
}

let inflight: Promise<boolean> | null = null;

/** Manda lo pendiente. Devuelve true si no quedó nada sin mandar. */
export function flush(opts: { keepalive?: boolean } = {}): Promise<boolean> {
  if (inflight) return inflight.then(() => (read().length ? flush(opts) : true));
  const ops = read();
  if (!ops.length) return Promise.resolve(true);
  inflight = (async () => {
    try {
      const ctrl = new AbortController();
      const to = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch('/api/sesion/sync', {
        method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ops }),
        keepalive: opts.keepalive, signal: ctrl.signal, cache: 'no-store',
      });
      clearTimeout(to);
      if (!r.ok) throw new Error(String(r.status));
      // Sacar solo lo que se mandó (si algo cambió mientras tanto, queda para la próxima)
      const sent = new Map(ops.map((o) => [opKey(o), JSON.stringify(o)]));
      write(read().filter((o) => sent.get(opKey(o)) !== JSON.stringify(o)));
      return read().length === 0;
    } catch {
      schedule(5000);
      return false;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

let started = false;
/** Reintentos automáticos: al volver la conexión, al volver a la app y al irse de la pantalla. */
export function startOutbox() {
  if (started || typeof window === 'undefined') return;
  started = true;
  window.addEventListener('online', () => { flush().catch(() => {}); });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush({ keepalive: true }).catch(() => {});
    else flush().catch(() => {});
  });
  window.addEventListener('pagehide', () => { flush({ keepalive: true }).catch(() => {}); });
  if (read().length) schedule(1000);
}

/* ---------- Borrador local de la sesión (lo que se ve en pantalla) ---------- */

export type DraftRow = { kg: string; reps: string; done: boolean };
export type Draft = { at: number; items: Record<number, { rows: DraftRow[]; feel?: 'liviano' | 'justo' | 'pesado' | null }> };

const dKey = (s: number) => `gm-sesion-${s}`;

export function readDraft(sessionId: number): Draft | null {
  try { return JSON.parse(localStorage.getItem(dKey(sessionId)) || 'null'); } catch { return null; }
}
export function writeDraft(sessionId: number, d: Draft) {
  try { localStorage.setItem(dKey(sessionId), JSON.stringify(d)); } catch {}
}
export function clearDraft(sessionId: number) {
  try { localStorage.removeItem(dKey(sessionId)); } catch {}
}
