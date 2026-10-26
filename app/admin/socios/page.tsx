import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { q } from '@/lib/db';
import { corta, daysBetween, today } from '@/lib/dates';
import { Chevron } from '@/components/Icons';

type S = { id: number; name: string; email: string; role: string; expires_on: string | null; last: string | null; has_routine: boolean; pending: boolean };

export default async function Socios({ searchParams }: { searchParams: { q?: string; f?: string } }) {
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
  const isVencida = (r: S) => !!r.expires_on && daysBetween(t, r.expires_on) < 0;
  const isVencer = (r: S) => !!r.expires_on && daysBetween(t, r.expires_on) >= 0 && daysBetween(t, r.expires_on) <= 7;
  const atrasados = rows.filter(isVencida).length;
  const porVencer = rows.filter(isVencer).length;
  const sinRutina = rows.filter((r) => !r.has_routine && r.role !== 'duena').length;
  const f = searchParams.f || 'todos';
  const term = (searchParams.q || '').trim().toLowerCase();
  const shown = rows
    .filter((r) => (f === 'vencer' ? isVencer(r) : f === 'vencidas' ? isVencida(r) : f === 'sin-rutina' ? !r.has_routine && r.role !== 'duena' : true))
    .filter((r) => !term || r.name.toLowerCase().includes(term) || r.email.toLowerCase().includes(term));
  const chip = (id: string, label: string, n: number) => (
    <Link href={`/admin/socios?f=${id}${term ? `&q=${encodeURIComponent(term)}` : ''}`} className="chip" aria-pressed={f === id}
      style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap', fontSize: 13 }}>{label} {n}</Link>
  );
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <h1 className="title-lg">Socios</h1>
      <form style={{ display: 'flex' }}>
        <input type="hidden" name="f" value={f} />
        <label style={{ flex: 1 }}><span className="sr">Buscar socio</span>
          <input className="input" type="search" name="q" defaultValue={searchParams.q ?? ''} placeholder="Buscar por nombre o email" />
        </label>
      </form>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {chip('todos', 'Todos', rows.length)}
        {chip('vencer', 'Por vencer', porVencer)}
        {chip('vencidas', 'Vencidas', atrasados)}
        {chip('sin-rutina', 'Sin rutina', sinRutina)}
      </div>
      <section>
        {shown.length === 0 && <p className="caption muted" style={{ padding: '12px 0' }}>No hay socios con ese filtro.</p>}
        {shown.map((r) => {
          const c = cuota(r.expires_on);
          return (
            <Link key={r.id} href={`/admin/socios/${r.id}`} className="list-row" style={{ gap: 12 }}>
              <span aria-hidden="true" style={{ width: 36, height: 36, flexShrink: 0, borderRadius: 999, background: 'var(--cuerda)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 14 }}>{r.name.slice(0, 1).toUpperCase()}</span>
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
