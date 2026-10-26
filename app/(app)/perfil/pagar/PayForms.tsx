'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { reportPayment, type ReportState } from './actions';

export function CopyButton({ text }: { text: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button type="button" className="link" style={{ fontSize: 13 }}
      onClick={() => { navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 1800); }).catch(() => {}); }}>
      {ok ? 'Copiado ✓' : 'Copiar datos'}
    </button>
  );
}

function Submit({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return <button className="btn btn-outline" disabled={pending} style={{ justifyContent: 'center', minHeight: 46, fontSize: 14 }}>{pending ? 'Enviando…' : label}</button>;
}

/** "Ya transferí" / "Ya pagué": fecha y comprobante (opcional). */
export function ReportForm({ method, today, label }: { method: 'transferencia' | 'mercadopago'; today: string; label: string }) {
  const [state, action] = useFormState<ReportState, FormData>(reportPayment, {});
  const [open, setOpen] = useState(false);
  if (state.ok) return <p className="caption brand strong">¡Listo! La dueña lo confirma y se actualiza tu cuota.</p>;
  if (!open) return <button type="button" className="btn btn-outline" onClick={() => setOpen(true)} style={{ justifyContent: 'center', minHeight: 46, fontSize: 14 }}>{label}</button>;
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name="method" value={method} />
      <label className="field"><span>Fecha del pago</span>
        <input className="input" type="date" name="paid_on" defaultValue={today} max={today} required style={{ background: 'var(--lona)' }} />
      </label>
      <label className="field"><span>Comprobante (opcional)</span>
        <input type="file" name="receipt" accept="image/*,application/pdf" style={{ fontSize: 14 }} />
      </label>
      <label className="field"><span>Nota (opcional)</span>
        <input className="input" name="note" placeholder="Ej.: transferí desde la cuenta de mi pareja" style={{ background: 'var(--lona)' }} />
      </label>
      {state.error && <p role="alert" className="caption" style={{ color: 'var(--alerta)', fontWeight: 600 }}>{state.error}</p>}
      <Submit label="Avisar a la dueña" />
    </form>
  );
}
