import Link from 'next/link';
import { redirect } from 'next/navigation';
import { currentUser, googleEnabled } from '@/lib/auth';
import AuthShell, { Divider, GoogleButton } from '@/components/AuthShell';
import RegisterForm from './RegisterForm';

export const dynamic = 'force-dynamic';

export default async function Registro() {
  if (await currentUser()) redirect('/');
  return (
    <AuthShell compact>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg" style={{ color: '#f5f5f5' }}>Creá tu cuenta</h1>
        <p className="muted">Después pedís tu rutina y la entrenadora te la arma.</p>
      </div>
      {googleEnabled() && (<><GoogleButton label="Registrarme con Google" /><Divider /></>)}
      <RegisterForm needsCode={Boolean(process.env.GYM_CODE)} />
      <p style={{ textAlign: 'center', fontSize: 15 }}>
        <span className="muted">¿Ya tenés cuenta? </span><Link href="/login" className="link" style={{ fontSize: 15 }}>Ingresá</Link>
      </p>
    </AuthShell>
  );
}
