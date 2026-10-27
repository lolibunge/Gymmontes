'use client';
import { useRouter } from 'next/navigation';
import { Close } from './Icons';

/**
 * Cerrar la ficha / el video y volver a donde estabas (la sesión en el mismo ejercicio),
 * en vez de ir siempre a Rutinas o al Inicio.
 */
export default function CloseButton({ volver, fallback = '/rutina', style }: { volver?: string; fallback?: string; style?: React.CSSProperties }) {
  const router = useRouter();
  const safe = volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : null;
  return (
    <button type="button" className="icon-btn" aria-label="Cerrar" style={{ position: 'relative', zIndex: 2, ...style }}
      onClick={() => {
        // Si hay un video en pantalla completa, primero salir de ahí
        try { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); } catch {}
        if (safe) router.replace(safe);
        else if (window.history.length > 1) router.back();
        else router.replace(fallback);
      }}>
      <Close />
    </button>
  );
}
