import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { membership, stats } from '@/lib/data';
import { corta, mesLargo } from '@/lib/dates';
import { Chevron } from '@/components/Icons';
import { declarePayment, setTheme } from './actions';
import { today } from '@/lib/dates';
import { logout } from '@/app/login/actions';

export default async function Perfil() {
  const user = await requireUser();
  const [cuota, st] = await Promise.all([membership(user.id), stats(user.id)]);
  const c = cuota && {
    'al día': { cls: 'bg-cuerda', label: 'Cuota · al día', lab: 'var(--campana)', ink: 'var(--campana)', num: 'var(--guante)', bar: 'var(--guante)' },
    'por vencer': { cls: 'bg-venda', label: 'Cuota · por vencer', lab: 'var(--violeta-texto)', ink: 'var(--guante)', num: 'var(--guante)', bar: 'var(--violeta)' },
    vencida: { cls: 'bg-alerta', label: 'Cuota · vencida', lab: 'var(--alerta)', ink: 'var(--alerta)', num: 'var(--alerta)', bar: 'var(--alerta)' },
  }[cuota.estado];
  const since = user.member_since;

  return (
    <main className="page tight">
      <header style={{ display: 'flex', alignItems: 'center', gap: 16, paddingTop: 8 }}>
        <span aria-hidden="true" style={{ width: 64, height: 64, borderRadius: 999, background: 'var(--guante)', color: 'var(--lona)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 28 }}>
          {user.name.slice(0, 1).toUpperCase()}
        </span>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <h1 className="title" style={{ fontSize: 32, lineHeight: '32px' }}>{user.name}</h1>
          <span className="muted" style={{ fontSize: 14 }}>{user.role === 'duena' ? 'Dueña' : 'Socia'} desde {mesLargo(since)} {since.slice(0, 4)}</span>
        </div>
      </header>

      {cuota && c ? (
        <section aria-label="Cuota" className={`card ${c.cls}`}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="label" style={{ color: c.lab }}>{c.label}</span>
            <span className="caption" style={{ color: c.ink }}>{cuota.left < 0 ? 'venció' : 'vence'} {corta(cuota.expires_on)}</span>
          </div>
          <span className="number" style={{ color: c.num }}>
            {cuota.left < 0 ? `Hace ${-cuota.left} ${cuota.left === -1 ? 'día' : 'días'}` : cuota.left === 0 ? 'Vence hoy' : `${cuota.left} ${cuota.left === 1 ? 'día' : 'días'}`}
          </span>
          <div className="progress" aria-hidden="true"><span style={{ width: `${cuota.pct}%`, background: c.bar }} /></div>
          <div className="row">
            <span className="caption" style={{ color: c.ink }}>
              {cuota.estado === 'al día' ? `Mes del ${corta(cuota.paid_on)} al ${corta(cuota.expires_on)}` : cuota.estado === 'por vencer' ? 'Te avisamos 7 días antes' : 'Pagala para seguir entrenando'}
            </span>
            <Link href="/perfil/pagar" className="link" style={{ fontSize: 13, color: cuota.estado === 'vencida' ? 'var(--alerta)' : undefined }}>Pagar mi cuota</Link>
          </div>
        </section>
      ) : (
        <form action={declarePayment} className="card bg-cuerda">
          <span className="label muted">Cuota</span>
          <span className="caption">¿Cuándo pagaste tu último mes? Con esa fecha calculamos los 30 días y te avisamos 7 días antes de que venza.</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <label style={{ flex: 1 }}><span className="sr">Fecha de pago</span>
              <input className="input" type="date" name="paid_on" required max={today()} style={{ background: 'var(--lona)' }} />
            </label>
            <button className="btn btn-primary" style={{ width: 'auto', fontSize: 14 }}>Guardar</button>
          </div>
        </form>
      )}

      <section aria-label="Tus números" style={{ display: 'flex', gap: 12, padding: '14px 0', borderTop: '1px solid var(--linea)', borderBottom: '1px solid var(--linea)' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="number" style={{ fontSize: 26 }}>{st.total}</span><span className="caption muted">sesiones</span></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="number brand" style={{ fontSize: 26 }}>{st.streak} sem.</span><span className="caption muted">en racha</span></div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}><span className="number" style={{ fontSize: 26 }}>{st.toRaise}</span><span className="caption muted">para subir peso</span></div>
      </section>

      <nav aria-label="Tu cuenta">
        <Link href="/perfil/datos" className="list-row" style={{ borderTop: 0 }}><span style={{ fontWeight: 500 }}>Datos personales</span><Chevron /></Link>
        <Link href="/perfil/objetivos" className="list-row"><span style={{ fontWeight: 500 }}>Objetivos y lesiones</span><Chevron /></Link>
        <Link href="/perfil/historial" className="list-row"><span style={{ fontWeight: 500 }}>Historial de sesiones</span><Chevron /></Link>
        <Link href="/perfil/notas" className="list-row"><span style={{ display: 'flex', flexDirection: 'column' }}><span style={{ fontWeight: 500 }}>Notas de prueba</span><span className="caption muted">Contanos qué falla o qué mejorarías</span></span><Chevron /></Link>
      </nav>

      <form action={setTheme} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
        <span className="label">Apariencia</span>
        <div role="group" aria-label="Apariencia" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 8, background: 'var(--cuerda)' }}>
          {(['claro', 'oscuro', 'auto'] as const).map((t) => {
            const on = user.theme === t;
            return (
              <button key={t} name="theme" value={t} aria-pressed={on}
                style={{ flex: 1, height: 40, border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 14, fontWeight: on ? 600 : 500,
                  background: on ? 'var(--lona)' : 'transparent', color: on ? 'var(--guante)' : 'var(--campana)', boxShadow: on ? 'inset 0 0 0 1.5px var(--linea)' : 'none' }}>
                {t === 'claro' ? 'Claro' : t === 'oscuro' ? 'Oscuro' : 'Auto'}
              </button>
            );
          })}
        </div>
      </form>

      <form action={logout} style={{ paddingTop: 8 }}>
        <button className="link" style={{ color: 'var(--campana)' }}>Cerrar sesión</button>
      </form>
      <p className="caption muted" style={{ textAlign: 'center', fontSize: 11, paddingTop: 8 }}>GYM MONTES · v1.4 beta · Desarrollado por Loli Bunge</p>
    </main>
  );
}
