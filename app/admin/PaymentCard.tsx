import Link from 'next/link';
import { corta, toIso } from '@/lib/dates';
import { METHOD_LABEL, type PayReport } from '@/lib/payments';
import { confirmPayment, rejectPayment } from './actions';

/** Un pago informado por un socio, con Confirmar / Rechazar. */
export default function PaymentCard({ p, back }: { p: PayReport; back: string }) {
  return (
    <article className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Link href={`/admin/socios/${p.user_id}`} className="strong" style={{ color: 'var(--guante)', fontSize: 16 }}>{p.name}</Link>
          <span className="caption muted">{METHOD_LABEL[p.method] ?? p.method} · pagó el {corta(p.paid_on)} · avisó el {corta(toIso(p.created_at))}</span>
        </span>
        <span className="badge bg-venda brand">Por confirmar</span>
      </div>
      {p.note && <p className="caption">{p.note}</p>}
      {p.has_receipt
        ? <a href={`/api/comprobante/${p.id}`} target="_blank" rel="noopener" className="link" style={{ fontSize: 13 }}>Ver comprobante</a>
        : <span className="caption muted">Sin comprobante: revisá en tu cuenta antes de confirmar.</span>}
      <div style={{ display: 'flex', gap: 8 }}>
        <form action={confirmPayment} style={{ flex: 1, display: 'flex' }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
          <button className="btn btn-primary" style={{ flex: 1, justifyContent: 'center', fontSize: 14, minHeight: 44 }}>Confirmar pago</button>
        </form>
        <form action={rejectPayment} style={{ display: 'flex' }}>
          <input type="hidden" name="id" value={p.id} /><input type="hidden" name="back" value={back} />
          <button className="btn btn-outline" style={{ fontSize: 13, minHeight: 44 }}>No llegó</button>
        </form>
      </div>
    </article>
  );
}
