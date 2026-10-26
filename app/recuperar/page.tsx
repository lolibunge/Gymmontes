import Link from 'next/link';
import AuthShell from '@/components/AuthShell';
import { emailEnabled, whatsappLink } from '@/lib/notify';
import { RequestForm } from './ResetForms';

export const dynamic = 'force-dynamic';

export default function Recuperar() {
  const wa = whatsappLink('Hola, no me acuerdo la contraseña de la app de GYM MONTES. ¿Me generan una nueva?');
  return (
    <AuthShell>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg" style={{ color: '#f5f5f5' }}>Nueva contraseña</h1>
        <p className="muted">
          {emailEnabled()
            ? 'Escribí el email con el que te registraste y te mandamos un link para elegir una contraseña nueva.'
            : 'Pedile a la entrenadora que te genere una contraseña nueva desde su panel. Después la podés cambiar.'}
        </p>
      </div>
      {emailEnabled() ? <RequestForm whatsapp={wa} /> : wa && <a href={wa} target="_blank" rel="noopener" className="btn btn-primary">Pedirla por WhatsApp</a>}
      <p style={{ textAlign: 'center' }}><Link href="/login" className="link" style={{ fontSize: 15 }}>Volver a entrar</Link></p>
    </AuthShell>
  );
}
