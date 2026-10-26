import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, googleEnabled } from '@/lib/auth';
import AuthShell, { Divider, GoogleButton } from '@/components/AuthShell';
import LoginForm from './LoginForm';

export const dynamic = 'force-dynamic';

const ERRORS: Record<string, string> = {
  google: 'No pudimos entrar con Google. Probá de nuevo.',
  'google-off': 'El ingreso con Google todavía no está activado.',
};

export default async function LoginPage({ searchParams }: { searchParams: { next?: string; error?: string } }) {
  if (await currentUser()) redirect('/');
  const next = searchParams.next || '/';
  return (
    <AuthShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg" style={{ color: '#f5f5f5' }}>Entrá a tu rutina</h1>
        <p className="muted">Ingresá con tu cuenta de GYM MONTES.</p>
      </div>
      {searchParams.error && ERRORS[searchParams.error] && <p role="alert" style={{ color: 'var(--alerta)', fontSize: 14, fontWeight: 600 }}>{ERRORS[searchParams.error]}</p>}
      {googleEnabled() && (<><GoogleButton next={next} /><Divider /></>)}
      <LoginForm next={next} />
      <p style={{ textAlign: 'center', fontSize: 15 }}>
        <span className="muted">¿Primera vez? </span><Link href="/registro" className="link" style={{ fontSize: 15 }}>Creá tu cuenta</Link>
      </p>
    </AuthShell>
  );
}
