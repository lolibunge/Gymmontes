'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { tempPassword, type TempPwState } from '../../actions';

function Submit() {
  const { pending } = useFormStatus();
  return <button className="btn btn-outline" disabled={pending} style={{ minHeight: 44, fontSize: 14 }}>{pending ? 'Generando…' : 'Generar contraseña nueva'}</button>;
}

export default function TempPassword({ id, email }: { id: number; email: string }) {
  const [state, action] = useFormState<TempPwState, FormData>(tempPassword, {});
  return (
    <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
      <h2 className="label">Acceso</h2>
      <p className="caption muted">Entra con <b style={{ color: 'var(--guante)' }}>{email}</b>. Si se olvidó la contraseña, generale una provisoria y pasásela. Después la puede cambiar en Perfil → Datos personales.</p>
      {state.password ? (
        <div className="bg-venda" style={{ borderRadius: 4, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          <span className="caption muted">Contraseña nueva (anotala, no se vuelve a mostrar):</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 22, letterSpacing: '0.04em', color: 'var(--guante)', userSelect: 'all' }}>{state.password}</span>
        </div>
      ) : (
        <form action={action} style={{ display: 'flex' }}>
          <input type="hidden" name="id" value={id} />
          <Submit />
        </form>
      )}
      {state.error && <p role="alert" className="caption" style={{ color: 'var(--alerta)' }}>{state.error}</p>}
    </section>
  );
}
