'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { login, type LoginState } from './actions';
import { Arrow } from '@/components/Icons';

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary" disabled={pending}>
      {pending ? 'ENTRANDO…' : 'ENTRAR'} <Arrow />
    </button>
  );
}

export default function LoginForm({ next }: { next: string }) {
  const [state, action] = useFormState<LoginState, FormData>(login, {});
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <input type="hidden" name="next" value={next} />
      <label className="field">
        <span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" inputMode="email" required placeholder="tu@email.com" />
      </label>
      <label className="field">
        <span>PIN</span>
        <input className="input" type="password" name="pin" autoComplete="current-password" inputMode="numeric" pattern="[0-9]*" maxLength={8} required placeholder="••••" />
      </label>
      {state.error && <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14, fontWeight: 600 }}>{state.error}</p>}
      <div style={{ paddingTop: 6 }}><Submit /></div>
    </form>
  );
}
