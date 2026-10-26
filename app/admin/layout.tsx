import Link from 'next/link';
import { pendingCount, requireOwner } from '@/lib/admin';
import AdminNav from './AdminNav';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireOwner();
  const pending = await pendingCount();
  return (
    <div style={{ minHeight: '100dvh', background: 'var(--lona)' }}>
      <div style={{ maxWidth: 760, margin: '0 auto', padding: 'calc(18px + env(safe-area-inset-top)) 24px 60px', display: 'flex', flexDirection: 'column', gap: 20 }}>
        <header className="row">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span aria-hidden="true" style={{ width: 10, height: 10, background: 'var(--violeta)' }} />
            <span className="label" style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.08em' }}>GYM MONTES</span>
            <span className="badge" style={{ background: 'var(--guante)', color: 'var(--lona)' }}>PANEL</span>
          </div>
          <Link href="/" className="link" style={{ fontSize: 14 }}>Ver app de {u.name.split(' ')[0]} →</Link>
        </header>
        <AdminNav pending={pending} />
        {children}
      </div>
    </div>
  );
}
