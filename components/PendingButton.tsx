'use client';
import { useFormStatus } from 'react-dom';

/** Botón de formulario que responde al instante: se apaga y muestra "Abriendo…" mientras el servidor contesta. */
export default function PendingButton({ children, pendingText = 'Abriendo…', className = 'btn btn-primary', style }: { children: React.ReactNode; pendingText?: string; className?: string; style?: React.CSSProperties }) {
  const { pending } = useFormStatus();
  return (
    <button className={className} style={style} disabled={pending} aria-busy={pending}>
      {pending ? <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span className="spinner" aria-hidden="true" />{pendingText}</span> : children}
    </button>
  );
}
