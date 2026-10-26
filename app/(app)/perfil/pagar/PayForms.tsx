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
const MES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const corta = (iso: string) => `${Number(iso.slice(8, 10))} ${MES[Number(iso.slice(5, 7)) - 1]}`;
const plus30 = (iso: string) => { const d = new Date(iso + 'T12:00:00Z'); d.setUTCDate(d.getUTCDate() + 30); return d.toISOString().slice(0, 10); };

export function ReportForm({ method, today, label, expires }: { method: 'transferencia' | 'mercadopago'; today: string; label: string; expires: string | null }) {
  const [paid, setPaid] = useState(today);
  const [state, action] = useFormState<ReportState, FormData>(reportPayment, {});
  const [open, setOpen] = useState(false);
  if (state.ok) return <p className="caption brand strong">¡Listo! La dueña lo confirma y se actualiza tu cuota.</p>;
  if (!open) return <button type="button" className="btn btn-outline" onClick={() => setOpen(true)} style={{ justifyContent: 'center', minHeight: 46, fontSize: 14 }}>{label}</button>;
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input type="hidden" name="method" value={method} />
      <label className="field"><span>¿Qué día pagaste?</span>
        <input className="input" type="date" name="paid_on" value={paid} onChange={(e) => setPaid(e.target.value)} max={today} required style={{ background: 'var(--lona)' }} />
      </label>
      {paid && (() => {
        // El mes que cubre: si pagás antes del vencimiento, arranca cuando vence el actual
        const start = expires && expires > paid ? expires : paid;
        return <p className="caption brand strong" style={{ marginTop: -4 }}>Este pago cubre del {corta(start)} al {corta(plus30(start))}.</p>;
      })()}
      <label className="field"><span>Comprobante (opcional)</span>
        <input type="file" name="receipt" accept="image/*,application/pdf" style={{ fontSize: 14 }} />
      </label>
      <label className="field"><span>Nota (opcional)</span>
        <input className="input" name="note" placeholder="Ej.: deposité en Abitab / transferí desde otra cuenta" style={{ background: 'var(--lona)' }} />
      </label>
      {state.error && <p role="alert" className="caption" style={{ color: 'var(--alerta)', fontWeight: 600 }}>{state.error}</p>}
      <Submit label="Avisar a la dueña" />
    </form>
  );
}
