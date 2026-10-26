'use client';
import { useState } from 'react';

/** Campo de contraseña con botón "Ver" para revisar lo que se escribió. */
export default function PasswordInput({ name = 'password', autoComplete = 'current-password', placeholder = '••••••••', minLength, style }: {
  name?: string; autoComplete?: string; placeholder?: string; minLength?: number; style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: 'relative', display: 'flex' }}>
      <input className="input" type={show ? 'text' : 'password'} name={name} autoComplete={autoComplete} minLength={minLength} required
        placeholder={placeholder} autoCapitalize="none" autoCorrect="off" spellCheck={false} style={{ paddingRight: 80, ...style }} />
      <button type="button" onClick={() => setShow(!show)} className="link" aria-pressed={show}
        aria-label={show ? 'Ocultar contraseña' : 'Ver contraseña'}
        style={{ position: 'absolute', right: 0, top: 0, height: 48, padding: '0 14px', fontSize: 13 }}>{show ? 'Ocultar' : 'Ver'}</button>
    </span>
  );
}
