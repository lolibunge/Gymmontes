import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { q } from '@/lib/db';
import { DIAS, corta, toIso } from '@/lib/dates';
import { markAttended } from '../actions';

type R = { id: number; user_id: number; name: string; email: string; goals: string[]; days: number | null; notes: string | null; status: string; created_at: Date; kind: string; change: string | null; weekday: number | null; exercise: string | null };

export default async function Pedidos() {
  await requireOwner();
  const rows = await q<R>(
    `select r.id, r.user_id, u.name, u.email, r.goals, r.days, r.notes, r.status, r.created_at, r.kind, r.change, r.weekday, r.exercise
       from routine_requests r join users u on u.id = r.user_id
      order by (r.status = 'Enviado') desc, r.created_at desc limit 60`
  );
  const nuevos = rows.filter((r) => r.status === 'Enviado');
  const resto = rows.filter((r) => r.status !== 'Enviado');
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 className="title-lg">Pedidos</h1>
        <p className="muted">{nuevos.length ? `${nuevos.length} ${nuevos.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}.` : 'No hay pedidos pendientes.'}</p>
      </div>
      {nuevos.map((r) => (
        <article key={r.id} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 12 }}>
          <div className="row" style={{ alignItems: 'flex-start' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Link href={`/admin/socios/${r.user_id}`} className="strong" style={{ color: 'var(--guante)', fontSize: 17 }}>{r.name}</Link>
              <span className="caption muted">{r.email} · {corta(toIso(r.created_at))}</span>
            </span>
            <span className="badge bg-venda brand">{r.kind === 'ajuste' ? 'Ajuste' : 'Rutina nueva'}</span>
          </div>
          {r.kind === 'ajuste' ? (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                <span className="badge" style={{ background: 'var(--guante)', color: 'var(--lona)' }}>{r.change ?? 'Ajuste'}</span>
                {r.weekday && <span className="badge" style={{ background: 'var(--cuerda)', color: 'var(--guante)', fontWeight: 600 }}>{DIAS[r.weekday]}</span>}
                {r.exercise && <span className="badge" style={{ background: 'var(--cuerda)', color: 'var(--guante)', fontWeight: 600 }}>{r.exercise}</span>}
              </div>
              {r.notes && <p className="caption">{r.notes}</p>}
            </>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {r.goals.map((g) => <span key={g} className="badge" style={{ background: 'var(--cuerda)', color: 'var(--guante)', fontWeight: 600 }}>{g}</span>)}
                {r.days && <span className="badge" style={{ background: 'var(--guante)', color: 'var(--lona)' }}>{r.days} días por semana</span>}
              </div>
              {r.notes && <p className="caption"><span className="strong">Lesiones o molestias: </span>{r.notes}</p>}
            </>
          )}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {r.kind === 'ajuste'
              ? <Link href={`/admin/socios/${r.user_id}/editar`} className="btn btn-primary" style={{ flex: '1 1 200px', fontSize: 14 }}>Editar su rutina →</Link>
              : <Link href={`/admin/socios/${r.user_id}/rutina`} className="btn btn-primary" style={{ flex: '1 1 200px', fontSize: 14 }}>Armar rutina →</Link>}
            <form action={markAttended} style={{ flex: '0 1 auto' }}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn btn-outline" style={{ fontSize: 13 }}>Marcar atendido</button>
            </form>
          </div>
        </article>
      ))}
      {resto.length > 0 && (
        <section>
          <h2 className="label" style={{ paddingBottom: 8 }}>Anteriores</h2>
          {resto.map((r) => (
            <Link key={r.id} href={`/admin/socios/${r.user_id}`} className="list-row">
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="strong">{r.name}</span>
                <span className="caption muted">{corta(toIso(r.created_at))} · {r.kind === 'ajuste' ? `Ajuste: ${r.change ?? ''}${r.exercise ? ` · ${r.exercise}` : ''}` : r.goals.join(', ') || 'sin objetivos'}</span>
              </span>
              <span className="badge" style={{ background: 'var(--cuerda)', color: 'var(--campana)' }}>{r.status === 'Lista' ? (r.kind === 'ajuste' ? 'Rutina editada' : 'Rutina enviada') : 'Atendido'}</span>
            </Link>
          ))}
        </section>
      )}
    </main>
  );
}
