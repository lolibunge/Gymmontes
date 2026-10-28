import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { saveDatos } from '../actions';
import { one } from '@/lib/db';
import ChangePassword from './ChangePassword';

export default async function Datos({ searchParams }: { searchParams: { ok?: string; error?: string } }) {
  const u = await requireUser();
  const pw = await one<{ has: boolean; show: boolean }>(`select pin_hash <> '' as has, show_birthday as show from users where id = $1`, [u.id]);
  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Volver a Perfil" right={searchParams.ok ? <span className="strong brand" style={{ fontSize: 14 }}>Guardado</span> : null} />
      <h1 className="title">Datos personales</h1>
      <form action={saveDatos} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <label className="field"><span>Nombre</span><input className="input" name="name" defaultValue={u.name} autoComplete="name" /></label>
        <label className="field"><span>Email</span><input className="input" value={u.email} readOnly aria-readonly="true" style={{ color: 'var(--campana)' }} /></label>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="field" style={{ flex: 1 }}><span>Celular</span><input className="input" name="phone" type="tel" defaultValue={u.phone ?? ''} autoComplete="tel" placeholder="09…" /></label>
          <label className="field" style={{ flex: 1 }}><span>Nacimiento</span><input className="input" name="birth" defaultValue={u.birth ?? ''} placeholder="DD/MM/AAAA" /></label>
        </div>
        {searchParams.error === 'nacimiento' && <p className="card bg-alerta caption strong" style={{ padding: '10px 14px' }}>No entendimos la fecha de nacimiento. Escribila como 05/03/1995.</p>}
        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14 }}>
          <input type="checkbox" name="show_birthday" defaultChecked={pw?.show ?? true} style={{ width: 20, height: 20, marginTop: 1, accentColor: 'var(--violeta)' }} />
          <span>Saludarme en Novedades el día de mi cumpleaños <span className="caption muted" style={{ display: 'block' }}>Los demás socios ven tu nombre ese día. Tu fecha y tu edad no se muestran.</span></span>
        </label>
        <h2 className="label" style={{ paddingTop: 6 }}>Cuerpo</h2>
        <div style={{ display: 'flex', gap: 12 }}>
          <label className="field" style={{ flex: 1 }}><span>Peso (kg)</span><input className="input" name="weight" inputMode="decimal" defaultValue={u.weight_kg ? Number(u.weight_kg) : ''} placeholder="—" /></label>
          <label className="field" style={{ flex: 1 }}><span>Altura (cm)</span><input className="input" name="height" inputMode="numeric" defaultValue={u.height_cm ? Number(u.height_cm) : ''} placeholder="—" /></label>
        </div>
        <h2 className="label" style={{ paddingTop: 6 }}>Contacto de emergencia</h2>
        <label className="field"><span className="sr">Contacto de emergencia</span><input className="input" name="emergency" defaultValue={u.emergency ?? ''} placeholder="Nombre y teléfono" /></label>
        <button className="btn btn-primary" style={{ justifyContent: 'center', marginTop: 6 }}>Guardar</button>
      </form>
      <ChangePassword hasPassword={!!pw?.has} />
    </main>
  );
}
