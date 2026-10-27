'use client';
import { useEffect } from 'react';

/**
 * Mantiene la pantalla encendida mientras `on` sea true.
 * - Usa la Screen Wake Lock API y la vuelve a pedir cada vez que la app vuelve al frente
 *   (el sistema la suelta sola al cambiar de app o bloquear).
 * - En teléfonos sin esa API (iPhone viejo, algunas apps instaladas) reproduce un video mudo en bucle,
 *   que es lo que evita que la pantalla se apague. Arranca con el primer toque, porque iOS lo exige.
 */
export function useWakeLock(on: boolean) {
  useEffect(() => {
    if (!on) return;
    let lock: any = null;
    let video: HTMLVideoElement | null = null;
    let alive = true;
    const hasApi = typeof navigator !== 'undefined' && 'wakeLock' in navigator;

    async function request() {
      if (!alive || document.visibilityState !== 'visible') return;
      if (hasApi) {
        try {
          if (!lock || lock.released) lock = await (navigator as any).wakeLock.request('screen');
          return;
        } catch { /* sin permiso o no soportado en este contexto: probamos con el video */ }
      }
      startVideo();
    }

    function startVideo() {
      if (!video) {
        video = document.createElement('video');
        video.setAttribute('playsinline', '');
        video.setAttribute('muted', '');
        video.muted = true;
        video.loop = true;
        video.src = '/keepawake.mp4';
        Object.assign(video.style, { position: 'fixed', width: '1px', height: '1px', opacity: '0.01', pointerEvents: 'none', left: '0', bottom: '0' });
        document.body.appendChild(video);
      }
      video.play().catch(() => {});
    }

    const onVis = () => { if (document.visibilityState === 'visible') request(); };
    const onTouch = () => { request(); };
    request();
    document.addEventListener('visibilitychange', onVis);
    document.addEventListener('pointerdown', onTouch, { passive: true });
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      document.removeEventListener('pointerdown', onTouch);
      lock?.release?.().catch?.(() => {});
      if (video) { video.pause(); video.remove(); }
    };
  }, [on]);
}
