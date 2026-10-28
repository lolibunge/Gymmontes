'use client';
import { useRef, useState } from 'react';
import { saveNote } from '@/lib/notes';

export default function NoteForm() {
  const ref = useRef<HTMLFormElement>(null);
  const [msg, setMsg] = useState<string | null>(null);
  return (
    <form ref={ref} className="card bg-cuerda" action={async (fd) => {
      setMsg(null);
      try {
        const r = await saveNote(fd);
        if (r.ok) { ref.current?.reset(); setMsg('¡Gracias! Nota guardada.'); } else setMsg(r.error || 'No se pudo guardar.');
      } catch { setMsg('Sin conexión. Probá de nuevo en un rato.'); }
    }}>
      <input type="hidden" name="context" value="Perfil" />
      <label className="field"><span>Tu nota</span>
        <textarea className="input" name="body" rows={4} required style={{ background: 'var(--lona)' }} placeholder="Qué pasó, en qué pantalla, qué esperabas que pase…" />
      </label>
      {msg && <p className="caption strong">{msg}</p>}
      <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar nota</button>
    </form>
  );
}
