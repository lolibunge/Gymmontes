'use client';
import { useEffect, useState } from 'react';
import { adjustRest, mmss, type RestTimer } from '@/lib/timers';
import { notifState } from '@/lib/bgnotify';
import { openTimerPip, PipIcon } from './TimerDock';
import { Close } from './Icons';

/**
 * Descanso en pantalla completa: se abre solo al marcar una serie.
 * Con la X se achica y queda la barra arriba de las series; el descanso sigue corriendo igual.
 */
export default function RestModal({ rest, now, pipOk, onClose, onSkip, onAsk }: {
  rest: RestTimer; now: number; pipOk: boolean; onClose: () => void; onSkip: () => void; onAsk: () => Promise<unknown>;
}) {
  const left = Math.max(0, (rest.endsAt - now) / 1000);
  const pct = rest.total > 0 ? Math.min(1, 1 - left / rest.total) : 1;
  const [perm, setPerm] = useState<string>('granted');
  useEffect(() => { setPerm(notifState()); }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="rest-modal" role="dialog" aria-modal="true" aria-label="Descanso">
      <div>
        <header className="row">
          <span className="label" style={{ color: '#d69ae8' }}>Descanso</span>
          <span style={{ display: 'flex', gap: 8 }}>
            {pipOk && <button type="button" className="icon-btn" onClick={() => openTimerPip()} aria-label="Ventanita flotante" style={{ background: '#2a2a2a', color: '#f5f5f5' }}><PipIcon /></button>}
            <button type="button" className="icon-btn" onClick={onClose} aria-label="Achicar (el descanso sigue)" style={{ background: '#2a2a2a', color: '#f5f5f5' }}><Close /></button>
          </span>
        </header>

        <section aria-live="polite" style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
          <span role="timer" className="rest-big">{mmss(left)}</span>
          <div className="ring" aria-hidden="true"><span style={{ width: `${pct * 100}%` }} /></div>
          <span style={{ fontSize: 15, color: '#bdbdbd' }}>{rest.label}</span>
          {rest.next && (
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingTop: 12, borderTop: '1px solid #2a2a2a' }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em', color: '#a3a3a3' }}>LO QUE SIGUE</span>
              <span className="strong" style={{ fontSize: 18 }}>{rest.next}</span>
            </span>
          )}
        </section>

        {perm === 'default' && (
          <button type="button" onClick={async () => { await onAsk(); setPerm(notifState()); }}
            style={{ border: 0, borderRadius: 4, padding: '12px 14px', background: '#251429', color: '#f5f5f5', textAlign: 'left', cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="strong" style={{ color: '#d69ae8' }}>🔔 Avisame aunque esté en otra app</span>
            <span style={{ fontSize: 13, color: '#bdbdbd' }}>Si te vas a Spotify o WhatsApp, te llega una notificación cuando termina el descanso.</span>
          </button>
        )}
        {perm === 'denied' && <p style={{ fontSize: 12, color: '#a3a3a3' }}>Los avisos están bloqueados. Activalos en los ajustes del navegador para este sitio si querés que te avise desde otras apps.</p>}

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="ctl" onClick={() => adjustRest(-15)} aria-label="15 segundos menos">−15</button>
          <button type="button" className="ctl" onClick={() => adjustRest(15)} aria-label="15 segundos más">+15</button>
        </div>
        <button type="button" className="btn btn-primary" style={{ justifyContent: 'center', minHeight: 60, background: '#c26bd8', color: '#111' }} onClick={onSkip}>Saltar descanso</button>
      </div>
    </div>
  );
}
