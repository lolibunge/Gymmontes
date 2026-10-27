import { METHOD_LABEL, pendingPayments } from '@/lib/payments';
import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { addDays, corta, DIAS, mesLargo, today, weekdayOf } from '@/lib/dates';

function Kpi({ n, label, href, tone }: { n: number; label: string; href: string; tone: 'violeta' | 'cuerda' | 'venda' | 'alerta' }) {
  const s = {
    violeta: { background: 'var(--violeta)', color: 'var(--on-violeta)', num: 'var(--on-violeta)' },
    cuerda: { background: 'var(--cuerda)', color: 'var(--guante)', num: 'var(--guante)' },
    venda: { background: 'var(--venda)', color: 'var(--guante)', num: 'var(--violeta-texto)' },
    alerta: { background: 'var(--alerta-suave)', color: 'var(--alerta)', num: 'var(--alerta)' },
  }[tone];
  return (
    <Link href={href} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: 14, borderRadius: 4, background: s.background, color: s.color }}>
      <span className="number" style={{ color: s.num }}>{n}</span>
      <span className="caption">{label}</span>
    </Link>
  );
}

export default async function Resumen() {
  const u = await requireOwner();
  const t = today();
  const monday = addDays(t, 1 - weekdayOf(t));
  const [pend, socios, cuotas, pedidos, semana, prev, nuevos] = await Promise.all([
    one<{ n: number }>(`select count(*)::int as n from routine_requests where status = 'Enviado'`),
    one<{ n: number }>(`select count(*)::int as n from users where role = 'socio'`),
    q<{ id: number; name: string; paid_on: string; expires_on: string; left: number }>(
      `select u.id, u.name, to_char(m.paid_on,'YYYY-MM-DD') as paid_on, to_char(m.expires_on,'YYYY-MM-DD') as expires_on, (m.expires_on - $1::date) as left
         from users u join lateral (select * from memberships m where m.user_id = u.id order by expires_on desc limit 1) m on true
        where u.role = 'socio' order by m.expires_on`, [t]),
    q<{ user_id: number; name: string; goals: string[]; days: number | null }>(
      `select r.user_id, u.name, r.goals, r.days from routine_requests r join users u on u.id = r.user_id where r.status = 'Enviado' order by r.created_at limit 3`),
    one<{ s: number; p: number }>(`select count(*)::int as s, count(distinct user_id)::int as p from sessions where finished_at is not null and date >= $1`, [monday]),
    one<{ s: number }>(`select count(*)::int as s from sessions where finished_at is not null and date >= $1 and date < $2`, [addDays(monday, -7), monday]),
    one<{ n: number }>(`select count(*)::int as n from users where role = 'socio' and created_at >= $1::date`, [monday]),
  ]);
  const pagos = await pendingPayments();
  const notas = await one<{ n: number; total: number }>(`select count(*) filter (where status = 'nueva')::int as n, count(*)::int as total from notes`);
  const porVencer = cuotas.filter((c) => c.left >= 0 && c.left <= 7);
  const vencidas = cuotas.filter((c) => c.left < 0);
  const urgentes = [...vencidas, ...porVencer.filter((c) => c.left <= 2)].slice(0, 4);
  const diff = prev?.s ? Math.round((((semana?.s ?? 0) - prev.s) / prev.s) * 100) : null;
  const [, m, d] = t.split('-').map(Number);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <span className="muted">{DIAS[weekdayOf(t)]} {d} de {mesLargo(t)}</span>
        <h1 className="title-lg">Hola, {u.name.split(' ')[0]}</h1>
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Kpi n={pend?.n ?? 0} label={pend?.n === 1 ? 'pedido de rutina' : 'pedidos de rutina'} href="/admin/pedidos" tone={pend?.n ? 'violeta' : 'cuerda'} />
        <Kpi n={socios?.n ?? 0} label="socios" href="/admin/socios" tone="cuerda" />
      </div>
      <div style={{ display: 'flex', gap: 10 }}>
        <Kpi n={porVencer.length} label="cuotas vencen en 7 días" href="/admin/socios?f=vencer" tone="venda" />
        <Kpi n={vencidas.length} label="cuotas vencidas" href="/admin/socios?f=vencidas" tone="alerta" />
      </div>

      <Link href="/admin/notas" className={`card ${notas?.n ? 'bg-venda' : 'bg-cuerda'}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', color: 'var(--guante)' }}>
        <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span className="label brand">Notas de prueba</span>
          <span className="caption">{notas?.n ? `${notas.n} ${notas.n === 1 ? 'nota nueva' : 'notas nuevas'} de los socios` : notas?.total ? 'Sin notas nuevas' : 'Los socios todavía no dejaron notas'}</span>
        </span>
        <span className="link">Ver →</span>
      </Link>

      <section>
        <h2 className="label" style={{ paddingBottom: 6 }}>Para hoy</h2>
        {pedidos.length === 0 && urgentes.length === 0 && pagos.length === 0 && <p className="caption muted" style={{ padding: '10px 0', borderTop: '1px solid var(--linea)' }}>Nada pendiente por hoy.</p>}
        {pagos.map((p) => (
          <Link key={`pg${p.id}`} href="/admin/gym?tab=cobros" className="list-row">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">{p.name} avisó que pagó</span>
              <span className="caption muted">{METHOD_LABEL[p.method]} · {corta(p.paid_on)}{p.has_receipt ? ' · con comprobante' : ''}</span>
            </span>
            <span className="link" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Confirmar →</span>
          </Link>
        ))}
        {pedidos.map((p) => (
          <Link key={`p${p.user_id}`} href={`/admin/socios/${p.user_id}/rutina`} className="list-row">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">{p.name} pidió rutina</span>
              <span className="caption muted">{p.goals.join(', ') || 'Sin objetivos'}{p.days ? ` · ${p.days} días` : ''}</span>
            </span>
            <span className="link" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>Armar →</span>
          </Link>
        ))}
        {urgentes.map((c) => (
          <Link key={`c${c.id}`} href={`/admin/socios/${c.id}`} className="list-row">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">Cuota de {c.name} {c.left < 0 ? `venció hace ${-c.left} ${c.left === -1 ? 'día' : 'días'}` : c.left === 0 ? 'vence hoy' : c.left === 1 ? 'vence mañana' : `vence en ${c.left} días`}</span>
              <span className="caption muted">Mes del {corta(c.paid_on)} al {corta(c.expires_on)}</span>
            </span>
            <span className="link" style={{ fontSize: 13, whiteSpace: 'nowrap', color: c.left < 0 ? 'var(--alerta)' : undefined }}>Registrar pago</span>
          </Link>
        ))}
      </section>

      <section className="card bg-esquina" style={{ gap: 10 }}>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <span className="label" style={{ color: '#d69ae8' }}>Esta semana</span>
          <span className="caption" style={{ color: '#bdbdbd' }}>Semana pasada: {prev?.s ?? 0} {(prev?.s ?? 0) === 1 ? 'sesión' : 'sesiones'}{diff !== null && (semana?.s ?? 0) > 0 ? ` (${diff >= 0 ? '+' : ''}${diff}%)` : ''}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span className="number" style={{ fontSize: 26 }}>{semana?.s ?? 0}</span><span className="caption" style={{ color: '#bdbdbd' }}>sesiones</span></span>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span className="number" style={{ fontSize: 26 }}>{semana?.p ?? 0}</span><span className="caption" style={{ color: '#bdbdbd' }}>socios entrenaron</span></span>
          <span style={{ display: 'flex', flexDirection: 'column' }}><span className="number" style={{ fontSize: 26 }}>{nuevos?.n ?? 0}</span><span className="caption" style={{ color: '#bdbdbd' }}>cuentas nuevas</span></span>
        </div>
      </section>
    </main>
  );
}
