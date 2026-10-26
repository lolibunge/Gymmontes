'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { changePassword, type PwState } from '../actions';
import PasswordInput from '@/components/PasswordInput';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-outline" disabled={pending} style={{ justifyContent: 'center' }}>{pending ? 'Guardando…' : 'Cambiar contraseña'}</button>;
}

export default function ChangePassword({ hasPassword }: { hasPassword: boolean }) {
  const [state, action] = useFormState<PwState, FormData>(changePassword, {});
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingTop: 10, borderTop: '1px solid var(--linea)' }}>
      <h2 className="label">Contraseña</h2>
      {hasPassword && (
        <label className="field"><span>Contraseña actual</span>
          <PasswordInput name="current" />
        </label>
      )}
      <label className="field"><span>Contraseña nueva</span>
        <PasswordInput autoComplete="new-password" minLength={8} placeholder="Mínimo 8 caracteres" />
      </label>
      {state.error && <p role="alert" className="caption" style={{ color: 'var(--alerta)', fontWeight: 600 }}>{state.error}</p>}
      {state.ok && <p className="caption brand strong">Listo, la próxima vez entrá con la contraseña nueva.</p>}
      <Submit />
    </form>
  );
}
