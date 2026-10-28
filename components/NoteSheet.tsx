'use client';
import { useState } from 'react';
import { saveNote } from '@/lib/notes';

/** Hoja para anotar algo durante el mes de prueba (un error, una idea, algo que no se entiende). */
export default function NoteSheet({ context, onClose }: { context: string; onClose: () => void }) {
  const [body, setBody] = useState('');
  const [state, setState] = useState<'idle' | 'saving' | 'ok' | 'error'>('idle');
  const [err, setErr] = useState('');

  async function send() {
    setState('saving');
    const fd = new FormData();
    fd.set('body', body); fd.set('context', context);
    try {
      const r = await saveNote(fd);
      if (r.ok) { setState('ok'); setTimeout(onClose, 900); }
      else { setState('error'); setErr(r.error || 'No se pudo guardar.'); }
    } catch {
      setState('error'); setErr('Sin conexión. Probá de nuevo en un rato.');
    }
  }

  return (
    <div className="sheet-bg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Nota de prueba" onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <span className="label brand">Nota de prueba</span>
          <button type="button" className="link" onClick={onClose}>Cerrar</button>
        </div>
        <p className="caption muted">¿Algo falló, no se entiende o se te ocurre una mejora? Anotalo acá y le llega a la entrenadora. <span className="strong">{context}</span></p>
        <textarea className="input" rows={4} autoFocus value={body} onChange={(e) => setBody(e.target.value)} placeholder="Ej.: al cerrar el video me llevó al inicio" />
        {state === 'error' && <p className="caption strong" style={{ color: 'var(--alerta)' }}>{err}</p>}
        <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={state === 'saving' || state === 'ok' || !body.trim()} onClick={send}>
          {state === 'saving' ? 'Guardando…' : state === 'ok' ? '¡Gracias! Guardada' : 'Guardar nota'}
        </button>
      </div>
    </div>
  );
}
