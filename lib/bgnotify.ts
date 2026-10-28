'use client';
/**
 * Avisos aunque la app no esté en pantalla (estás en Spotify, WhatsApp, o con el teléfono bloqueado).
 *
 * Al salir de la app con un cronómetro andando, le pasamos al service worker (public/sw.js) cuándo termina
 * cada cosa. El service worker muestra una notificación fija ("Descanso · termina 8:42") y,
 * a la hora justa, otra que suena y vibra. Al volver a la app se cancelan.
 *
 * Límites de una web: en Android anda con Chrome; en iPhone solo si la app está instalada en la
 * pantalla de inicio (iOS 16.4 o más) y aun así iOS puede demorar el aviso.
 */
export type BgAlert = { at: number; title: string; body: string };
export type BgPlan = { ongoing: { title: string; body: string } | null; alerts: BgAlert[] };

export function notifSupported() {
  return typeof window !== 'undefined' && 'Notification' in window && 'serviceWorker' in navigator;
}
export function notifState(): NotificationPermission | 'unsupported' {
  return notifSupported() ? Notification.permission : 'unsupported';
}

/** Pedir permiso (tiene que ser dentro de un toque). */
export async function askNotifications() {
  if (!notifSupported()) return 'unsupported' as const;
  try { return await Notification.requestPermission(); } catch { return Notification.permission; }
}

async function sw() {
  if (!notifSupported()) return null;
  try { return (await navigator.serviceWorker.ready) ?? null; } catch { return null; }
}

export async function sendPlan(plan: BgPlan) {
  if (notifState() !== 'granted') return;
  const reg = await sw();
  reg?.active?.postMessage({ type: 'gm-plan', plan, now: Date.now() });
}

export async function cancelPlan() {
  const reg = await sw();
  reg?.active?.postMessage({ type: 'gm-cancel' });
}
