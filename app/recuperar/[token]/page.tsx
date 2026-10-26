import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { checkResetToken } from '@/lib/reset';
import { NewPasswordForm } from '../ResetForms';

export const dynamic = 'force-dynamic';

export default async function NuevaClave({ params }: { params: { token: string } }) {
  const u = await checkResetToken(decodeURIComponent(params.token));
  return (
    <AuthShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg" style={{ color: '#f5f5f5' }}>Nueva contraseña</h1>
        <p className="muted">{u ? `Elegí una contraseña nueva para ${u.email}.` : 'Este link ya no sirve: venció o ya se usó.'}</p>
      </div>
      {u ? <NewPasswordForm token={decodeURIComponent(params.token)} /> : <Link href="/recuperar" className="btn btn-primary">Pedir otro link</Link>}
    </AuthShell>
  );
}
