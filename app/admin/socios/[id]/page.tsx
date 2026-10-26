import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { membership, routineDays, weightLabel, minutes } from '@/lib/data';
import { corta, DIAS, mesLargo, today, toIso } from '@/lib/dates';
import { registerPayment } from '../../actions';
import BackBar from '@/components/BackBar';
import TempPassword from './TempPassword';
import PaymentCard from '../../PaymentCard';
import { pendingPayments } from '@/lib/payments';

export default async function Socio({ params, searchParams }: { params: { id: string }; searchParams: { rutina?: string; editada?: string } }) {
  await requireOwner();
  const id = Number(params.id);
  const u = await one<{ id: number; name: string; email: string; phone: string | null; goals_text: string | null; member_since: string; created_at: Date }>(
    `select id, name, email, phone, goals_text, to_char(member_since,'YYYY-MM-DD') as member_since, created_at from users where id = $1`, [id]);
  if (!u) notFound();
  const [cuota, days, injuries, req, pagos] = await Promise.all([
    membership(id), routineDays(id),
    q<{ title: string; status: string; notes: string | null }>('select title, status, notes from injuries where user_id = $1 order by id', [id]),
    one<{ goals: string[]; days: number | null; notes: string | null; status: string }>('select goals, days, notes, status from routine_requests where user_id = $1 order by id desc limit 1', [id]),
    q<{ paid_on: string }>(`select to_char(paid_on,'YYYY-MM-DD') as paid_on from memberships where user_id = $1 order by paid_on desc limit 4`, [id]),
  ]);
  const st = await one<{ mes: number; last: string | null }>(
    `select count(*) filter (where to_char(date,'YYYY-MM') = $2)::int as mes, to_char(max(date),'YYYY-MM-DD') as last
       from sessions where user_id = $1 and finished_at is not null`, [id, today().slice(0, 7)]);
  const subir = days.reduce((a, d) => a + d.items.filter((i) => i.raise_weight).length, 0);
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <BackBar href="/admin/socios" label="Volver a Socios" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <h1 className="title">{u.name}</h1>
        <span className="caption muted">{u.email}{u.phone ? ` · ${u.phone}` : ''} · cuenta desde {mesLargo(toIso(u.created_at))}</span>
      </div>
      {(searchParams.rutina || searchParams.editada) && (
        <p className="card bg-venda strong brand" style={{ padding: '12px 14px' }}>{searchParams.rutina ? `Rutina guardada. ${u.name} ya la ve en su app.` : 'Cambios guardados.'}</p>
      )}

      {(await pendingPayments(u.id)).map((p) => <PaymentCard key={p.id} p={p} back={`/admin/socios/${u.id}`} />)}
      <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)' }}>
        <div className="row"><h2 className="label">Cuota</h2>
          {cuota && <span className={`badge ${cuota.estado === 'vencida' ? 'bg-alerta' : cuota.estado === 'por vencer' ? 'bg-venda brand' : 'bg-cuerda'}`}>{cuota.estado === 'al día' ? 'Al día' : cuota.estado === 'por vencer' ? 'Por vencer' : 'Vencida'}</span>}
        </div>
        <p>{cuota ? <>Pagó el <b>{corta(cuota.paid_on)}</b> · vence el <b>{corta(cuota.expires_on)}</b> ({cuota.left < 0 ? `hace ${-cuota.left} días` : `faltan ${cuota.left} días`})</> : 'Todavía no hay pagos registrados.'}</p>
        <form action={registerPayment} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input type="hidden" name="user" value={id} />
          <label className="field" style={{ flex: '1 1 160px' }}><span>Registrar pago</span>
            <input className="input" type="date" name="paid_on" defaultValue={today()} max={today()} required />
          </label>
          <button className="btn btn-primary" style={{ width: 'auto', flex: '0 0 auto', fontSize: 14 }}>Registrar 30 días</button>
        </form>
        {pagos.length > 1 && <span className="caption muted">Pagos anteriores: {pagos.slice(1).map((p) => corta(p.paid_on)).join(' · ')}</span>}
      </section>

      <section style={{ display: 'flex', gap: 10 }}>
        <div className="card bg-cuerda" style={{ flex: 1, gap: 0, padding: 12 }}><span className="number" style={{ fontSize: 24 }}>{st?.mes ?? 0}</span><span className="caption muted">sesiones este mes</span></div>
        <div className="card bg-cuerda" style={{ flex: 1, gap: 0, padding: 12 }}><span className="number" style={{ fontSize: 24 }}>{subir}</span><span className="caption muted">para subir peso</span></div>
        <div className="card bg-cuerda" style={{ flex: 1, gap: 0, padding: 12 }}><span className="number" style={{ fontSize: 24 }}>{st?.last ? corta(st.last) : '—'}</span><span className="caption muted">última vez</span></div>
      </section>

      <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)' }}>
        <div className="row"><h2 className="label">Rutina</h2>
          <span style={{ display: 'flex', gap: 14 }}>
            {days.length > 0 && <Link href={`/admin/socios/${id}/editar`} className="link">Editar</Link>}
            <Link href={`/admin/socios/${id}/rutina`} className="link">{days.length ? 'Subir nueva' : 'Subir rutina'}</Link>
          </span>
        </div>
        {days.length === 0 && <p className="muted">Sin rutina asignada.</p>}
        {days.map((d) => (
          <div key={d.id} style={{ borderTop: '1px solid var(--linea)', paddingTop: 10 }}>
            <p className="strong">{DIAS[d.weekday]} <span className="muted" style={{ fontWeight: 400 }}>· {d.subtitle}</span></p>
            <p className="caption muted">
              {d.items.map((i) => i.kind === 'cardio' ? `${i.name} ${minutes(i.segments)}′` : `${i.name} ${i.sets}×${i.reps} ${weightLabel(i.weight_kg)}`).join(' · ')}
            </p>
          </div>
        ))}
      </section>

      <section className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)' }}>
        <h2 className="label">Objetivos y lesiones</h2>
        {req && <p className="caption"><b>Último pedido:</b> {req.goals.join(', ') || '—'} · {req.days ?? '—'} días{req.notes ? ` · ${req.notes}` : ''}</p>}
        {u.goals_text && <p className="caption">{u.goals_text}</p>}
        {injuries.map((i, k) => <p key={k} className="caption"><b>{i.title}</b> ({i.status.toLowerCase()}){i.notes ? `: ${i.notes}` : ''}</p>)}
        {!req && !u.goals_text && injuries.length === 0 && <p className="caption muted">Sin datos cargados.</p>}
      </section>

      <TempPassword id={u.id} email={u.email} />
    </main>
  );
}
