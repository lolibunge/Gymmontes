import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: { next?: string } }) {
  if (await currentUser()) redirect('/');
  return (
    <div className="t-oscuro" style={{ minHeight: '100dvh', background: '#080808', color: 'var(--guante)' }}>
      <main className="app" style={{ background: '#080808', padding: 'calc(24px + env(safe-area-inset-top)) 24px 32px', gap: 24, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 12 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.jpg" alt="GYM MONTES" width={260} height={260} style={{ width: 260, height: 260, objectFit: 'contain', mixBlendMode: 'lighten' }} />
        </div>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <h1 className="title-lg" style={{ color: '#f5f5f5' }}>Entrá a tu rutina</h1>
            <p className="muted">Usá el email que diste en recepción y tu PIN.</p>
          </div>
          <LoginForm next={searchParams.next || '/'} />
          <p className="caption muted" style={{ textAlign: 'center' }}>
            ¿Todavía no tenés usuario o te olvidaste el PIN? Pedíselo a la entrenadora en recepción.
          </p>
        </section>
      </main>
    </div>
  );
}
