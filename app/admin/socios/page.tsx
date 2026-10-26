import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { q } from '@/lib/db';
import { corta, daysBetween, today } from '@/lib/dates';
import { Chevron } from '@/components/Icons';

type S = { id: number; name: string; email: string; role: string; expires_on: string | null; last: string | null; has_routine: boolean; pending: boolean };

export default async function Socios() {
  await requireOwner();
  const rows = await q<S>(
    `select u.id, u.name, u.email, u.role,
            (select to_char(max(expires_on),'YYYY-MM-DD') from memberships m where m.user_id = u.id) as expires_on,
            (select to_char(max(date),'YYYY-MM-DD') from sessions s where s.user_id = u.id and s.finished_at is not null) as last,
            exists(select 1 from routines r where r.user_id = u.id and r.active) as has_routine,
            exists(select 1 from routine_requests r where r.user_id = u.id and r.status = 'Enviado') as pending
       from users u order by u.name`
  );
  const t = today();
  const cuota = (e: string | null) => {
    if (!e) return { txt: 'Sin pago', cls: 'bg-cuerda', ink: 'var(--campana)' };
    const left = daysBetween(t, e);
    if (left < 0) return { txt: 'Vencida', cls: 'bg-alerta', ink: 'var(--alerta)' };
    if (left <= 7) return { txt: `Vence en ${left} d`, cls: 'bg-venda', ink: 'var(--violeta-texto)' };
    return { txt: 'Al día', cls: 'bg-cuerda', ink: 'var(--guante)' };
  };
  const atrasados = rows.filter((r) => r.expires_on && daysBetween(t, r.expires_on) < 0).length;
  const porVencer = rows.filter((r) => r.expires_on && daysBetween(t, r.expires_on) >= 0 && daysBetween(t, r.expires_on) <= 7).length;
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Socios</h1>
      <section style={{ display: 'flex', gap: 12 }}>
        <div className="card bg-cuerda" style={{ flex: 1, gap: 2 }}><span className="number">{rows.length}</span><span className="caption muted">cuentas</span></div>
        <div className="card bg-venda" style={{ flex: 1, gap: 2 }}><span className="number brand">{porVencer}</span><span className="caption">por vencer (7 días)</span></div>
        <div className="card bg-alerta" style={{ flex: 1, gap: 2 }}><span className="number">{atrasados}</span><span className="caption">vencidas</span></div>
      </section>
      <section>
        {rows.map((r) => {
          const c = cuota(r.expires_on);
          return (
            <Link key={r.id} href={`/admin/socios/${r.id}`} className="list-row" style={{ gap: 14 }}>
              <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span className="strong">{r.name}{r.role === 'duena' && <span className="muted" style={{ fontWeight: 500 }}> · dueña</span>}</span>
                <span className="caption muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {r.pending ? 'Pidió rutina' : r.has_routine ? 'Con rutina' : 'Sin rutina'} · {r.last ? `entrenó el ${corta(r.last)}` : 'todavía no entrenó'}
                </span>
              </span>
              <span className={`badge ${c.cls}`} style={{ color: c.ink }}>{c.txt}</span>
              <Chevron />
            </Link>
          );
        })}
      </section>
    </main>
  );
}
