'use client';
/**
 * Campana (dos golpes) y vibración, para avisar fin de tramo o de descanso.
 * Usa un solo AudioContext que se "desbloquea" con el primer toque: en iPhone un AudioContext
 * creado fuera de un toque queda mudo, y por eso antes la campana a veces no sonaba.
 */
let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

/** Llamar una vez: desbloquea el audio con el primer toque en la pantalla. */
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  const go = () => {
    const c = getCtx();
    if (!c) return;
    // Un sonido vacío dentro del toque deja el audio habilitado
    try { const b = c.createBuffer(1, 1, 22050); const s = c.createBufferSource(); s.buffer = b; s.connect(c.destination); s.start(0); } catch {}
  };
  window.addEventListener('pointerdown', go, { passive: true });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && ctx?.state === 'suspended') ctx.resume().catch(() => {}); });
}

export function bell(times = 2) {
  const c = getCtx();
  if (c) {
    try {
      Array.from({ length: times }, (_, k) => k * 0.35).forEach((t) => {
        const o = c.createOscillator(); const g = c.createGain();
        o.type = 'triangle'; o.frequency.value = 1320;
        g.gain.setValueAtTime(0.0001, c.currentTime + t);
        g.gain.exponentialRampToValueAtTime(0.6, c.currentTime + t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t + 0.9);
        o.connect(g).connect(c.destination); o.start(c.currentTime + t); o.stop(c.currentTime + t + 1);
      });
    } catch {}
  }
  try { navigator.vibrate?.([300, 120, 300]); } catch {}
}

/** "Tic" corto para la cuenta regresiva de los últimos segundos. El último (1) suena más agudo. */
export function tick(last = false) {
  const c = getCtx();
  if (c) {
    try {
      const o = c.createOscillator(); const g = c.createGain();
      o.type = 'square'; o.frequency.value = last ? 1320 : 880;
      g.gain.setValueAtTime(0.0001, c.currentTime);
      g.gain.exponentialRampToValueAtTime(0.25, c.currentTime + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.15);
      o.connect(g).connect(c.destination); o.start(c.currentTime); o.stop(c.currentTime + 0.17);
    } catch {}
  }
  try { navigator.vibrate?.(60); } catch {}
}
