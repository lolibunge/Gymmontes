'use client';
import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { register, type FormState } from '../login/actions';
import { Arrow } from '@/components/Icons';

function Submit() {
  const { pending } = useFormStatus();
  return <button type="submit" className="btn btn-primary" disabled={pending}>{pending ? 'CREANDO…' : 'CREAR CUENTA'} <Arrow /></button>;
}

export default function RegisterForm({ needsCode }: { needsCode: boolean }) {
  const [state, action] = useFormState<FormState, FormData>(register, {});
  const [show, setShow] = useState(false);
  const ring = (f: string) => (state.field === f ? { outline: '2px solid var(--alerta)' } : undefined);
  return (
    <form action={action} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <label className="field"><span>Nombre</span>
        <input className="input" name="name" autoComplete="name" required placeholder="Cómo te llamás" style={ring('name')} />
      </label>
      <label className="field"><span>Email</span>
        <input className="input" type="email" name="email" autoComplete="email" inputMode="email" required placeholder="tu@email.com" style={ring('email')} />
      </label>
      <label className="field"><span>Contraseña</span>
        <span style={{ position: 'relative', display: 'flex' }}>
          <input className="input" type={show ? 'text' : 'password'} name="password" autoComplete="new-password" minLength={8} required placeholder="Mínimo 8 caracteres" style={{ ...ring('password'), paddingRight: 72 }} />
          <button type="button" onClick={() => setShow(!show)} className="link" style={{ position: 'absolute', right: 14, top: 14, fontSize: 13 }}>{show ? 'Ocultar' : 'Ver'}</button>
        </span>
      </label>
      {needsCode && (
        <label className="field"><span>Código del gimnasio</span>
          <input className="input" name="code" required placeholder="Te lo dan en recepción" autoCapitalize="characters" style={ring('code')} />
        </label>
      )}
      {state.error && <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14, fontWeight: 600 }}>{state.error}</p>}
      <div style={{ paddingTop: 4 }}><Submit /></div>
    </form>
  );
}
