import { pendingCount, requireOwner } from '@/lib/admin';
import { logout } from '@/app/login/actions';
import OwnerTabBar from './OwnerTabBar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireOwner();
  const pending = await pendingCount();
  return (
    <div className="app">
      <div className="page">
        <header className="row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, background: 'var(--violeta)' }} />
            <span className="label" style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.08em' }}>GYM MONTES</span>
            <span className="badge" style={{ background: 'var(--guante)', color: 'var(--lona)' }}>PANEL</span>
          </div>
          <form action={logout}>
            <button className="link" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--campana)' }} aria-label="Cerrar sesión">
              Salir
              <span aria-hidden="true" style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--violeta)', color: 'var(--on-violeta)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 15 }}>
                {u.name.slice(0, 1).toUpperCase()}
              </span>
            </button>
          </form>
        </header>
        {children}
        <p className="caption muted" style={{ textAlign: 'center', fontSize: 11 }}>GYM MONTES · v1.1 beta · Desarrollado por Loli Bunge</p>
      </div>
      <OwnerTabBar pending={pending} />
    </div>
  );
}
