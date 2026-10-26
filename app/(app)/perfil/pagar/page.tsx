import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { membership } from '@/lib/data';
import { corta, today } from '@/lib/dates';
import { METHOD_LABEL, paySettings, pendingPayments } from '@/lib/payments';
import { CopyButton, ReportForm } from './PayForms';

export default async function Pagar() {
  const user = await requireUser();
  const [cuota, cfg, pend] = await Promise.all([membership(user.id), paySettings(), pendingPayments(user.id)]);
  const p = pend[0];
  const t = today();
  const nothing = !cfg.cash && !cfg.bank && !cfg.mpLink;
  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Volver a Perfil" />
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 className="title">Pagar mi cuota</h1>
        <p className="muted" style={{ fontSize: 14 }}>
          {cuota ? (cuota.left < 0 ? `Tu cuota venció el ${corta(cuota.expires_on)}.` : `Tu cuota vence el ${corta(cuota.expires_on)}.`) : 'Todavía no tenés una cuota registrada.'}
          {' '}Si pagás antes, el mes nuevo arranca cuando termina el actual.
        </p>
      </header>

      {(cfg.fee || cfg.dayFee) && (
        <section className="card bg-esquina" style={{ gap: 8 }}>
          {cfg.fee && (
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span className="label" style={{ color: '#d69ae8' }}>Cuota mensual</span>
              <span className="number" style={{ color: '#f5f5f5', fontSize: 28 }}>{cfg.fee}</span>
            </div>
          )}
          {cfg.dayFee && (
            <div className="row" style={{ alignItems: 'baseline', paddingTop: cfg.fee ? 8 : 0, borderTop: cfg.fee ? '1px solid #2a2a2a' : 0 }}>
              <span className="caption" style={{ color: '#bdbdbd' }}>Pase por día</span>
              <span className="strong" style={{ color: '#f5f5f5' }}>{cfg.dayFee}</span>
            </div>
          )}
        </section>
      )}

      {p && (
        <section className="card bg-venda" style={{ gap: 4 }}>
          <span className="strong brand">Pago informado · esperando confirmación</span>
          <span className="caption">{METHOD_LABEL[p.method]} del {corta(p.paid_on)}{p.has_receipt ? ' · con comprobante' : ''}. Cuando la dueña lo confirme, se actualiza tu cuota.</span>
        </section>
      )}

      {nothing && <p className="caption muted">El gimnasio todavía no cargó las formas de pago. Consultá en recepción.</p>}

      {cfg.cash && (
        <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 6 }}>
          <span className="strong">Efectivo en recepción</span>
          <span className="caption muted">{cfg.cashNote || 'Pagás en el gimnasio y la dueña registra tu pago.'}</span>
        </section>
      )}

      {cfg.bank && (
        <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="strong">Depósito o transferencia bancaria</span>
            <CopyButton text={cfg.bank} />
          </div>
          <pre className="bg-cuerda" style={{ margin: 0, padding: '10px 12px', borderRadius: 4, fontFamily: 'var(--font-inter)', fontSize: 14, lineHeight: '20px', whiteSpace: 'pre-wrap' }}>{cfg.bank}</pre>
          <ReportForm method="transferencia" today={t} label="Ya deposité o transferí" />
        </section>
      )}

      {cfg.mpLink && (
        <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
          <span className="strong">Mercado Pago</span>
          <span className="caption muted">Pagás con tarjeta, débito o saldo de Mercado Pago. Después volvé acá y avisá.</span>
          <a href={cfg.mpLink} target="_blank" rel="noopener" className="btn" style={{ background: '#009ee3', color: '#ffffff', justifyContent: 'center' }}>Pagar con Mercado Pago</a>
          <ReportForm method="mercadopago" today={t} label="Ya pagué" />
        </section>
      )}
    </main>
  );
}
