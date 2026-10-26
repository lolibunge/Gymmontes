'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { requestReset, setNewPassword, type ResetState } from './actions';
import { Arrow } from '@/components/Icons';
import PasswordInput from '@/components/PasswordInput';

function Submit({ label, busy }: { label: string; busy: string }) {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? busy : label} <Arrow /></button>;
}

export function RequestForm({ whatsapp }: { whatsapp: string | null }) {
  const [state, action] = useFormState<ResetState, FormData>(requestReset, {});
  if (state.sent) {
    return <p className="card bg-venda" style={{ color: 'var(--guante)' }}>Si hay una cuenta con ese email, te mandamos un link para elegir una contraseña nueva. Revisá también la carpeta de spam.</p>;
  }
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="field"><span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" inputMode="email" required placeholder="tu@email.com" />
      </label>
      {state.error && (
        <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14, fontWeight: 600 }}>
          {state.error}{whatsapp && <> <a href={whatsapp} target="_blank" rel="noopener" className="link">Escribile por WhatsApp</a></>}
        </p>
      )}
      <div style={{ paddingTop: 4 }}><Submit label="MANDAME EL LINK" busy="ENVIANDO…" /></div>
    </form>
  );
}

export function NewPasswordForm({ token }: { token: string }) {
  const [state, action] = useFormState<ResetState, FormData>(setNewPassword, {});
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input type="hidden" name="token" value={token} />
      <label className="field"><span>Contraseña nueva</span>
        <PasswordInput autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" />
      </label>
      {state.error && <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14, fontWeight: 600 }}>{state.error}</p>}
      <div style={{ paddingTop: 4 }}><Submit label="GUARDAR Y ENTRAR" busy="GUARDANDO…" /></div>
    </form>
  );
}
