import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { membership, raiseSignals, routineDays, weightLabel, minutes } from '@/lib/data';
import { corta, daysBetween, DIAS, mesLargo, today, toIso } from '@/lib/dates';
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
  const sig = await raiseSignals(id, days.flatMap((d) => d.items));
  const ajustes = days.flatMap((d) => d.items.filter((i) => sig.has(i.id)).map((i) => ({ id: i.id, name: i.name, weekday: d.weekday, dir: sig.get(i.id)!.dir })));
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
        <p>{cuota ? <>Mes pago: del <b>{corta(cuota.paid_on)}</b> al <b>{corta(cuota.expires_on)}</b> ({cuota.left < 0 ? `venció hace ${-cuota.left} días` : `faltan ${cuota.left} días`})</> : 'Todavía no hay pagos registrados.'}</p>
        <form action={registerPayment} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input type="hidden" name="user" value={id} />
          <label className="field" style={{ flex: '1 1 160px' }}><span>Registrar pago</span>
            <input className="input" type="date" name="paid_on" defaultValue={today()} max={today()} required />
          </label>
          <button className="btn btn-primary" style={{ width: 'auto', flex: '0 0 auto', fontSize: 14 }}>Registrar 30 días</button>
        </form>
        {pagos.length > 1 && <span className="caption muted">Pagos anteriores: {pagos.slice(1).map((p) => corta(p.paid_on)).join(' · ')}</span>}
      </section>

      <section className="card bg-cuerda" style={{ gap: 12 }}>
        <h2 className="label">Cómo viene entrenando</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="number" style={{ fontSize: 26 }}>{st?.mes ?? 0}</span>
            <span className="caption muted">{(st?.mes ?? 0) === 1 ? 'sesión' : 'sesiones'} en {mesLargo(today())}</span>
          </span>
          <span style={{ display: 'flex', flexDirection: 'column' }}>
            <span className="number" style={{ fontSize: 26 }}>{!st?.last ? '—' : st.last === today() ? 'Hoy' : daysBetween(st.last, today()) === 1 ? 'Ayer' : corta(st.last)}</span>
            <span className="caption muted">{!st?.last ? 'todavía no entrenó' : daysBetween(st.last, today()) > 7 ? `último entreno · hace ${daysBetween(st.last, today())} días` : 'último entreno'}</span>
          </span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', borderTop: '1px solid var(--linea)', paddingTop: 10, gap: 2 }}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="strong" style={{ fontSize: 14 }}>Para ajustar el peso</span>
            {ajustes.length > 0 && <Link href={`/admin/socios/${u.id}/editar`} className="link" style={{ fontSize: 13 }}>Editar rutina</Link>}
          </div>
          {ajustes.length === 0 && <span className="caption muted">Nada por ahora. Aparece cuando el socio marca Liviano o Pesado, o llega al máximo de reps.</span>}
          {ajustes.map((a) => (
            <div key={a.id} className="row" style={{ alignItems: 'baseline', gap: 10, padding: '6px 0', fontSize: 13 }}>
              <span>{a.name} <span className="muted">· {DIAS[a.weekday]}</span></span>
              <span style={{ whiteSpace: 'nowrap', fontWeight: 700, color: a.dir === 'down' ? 'var(--alerta)' : 'var(--violeta-texto)' }}>
                {a.dir === 'down' ? '▼ bajar' : '▲ subir'}
              </span>
            </div>
          ))}
          {ajustes.length > 0 && <span className="caption muted" style={{ paddingTop: 4 }}>▲ marcó Liviano, llegó al máximo de reps o lo marcaste vos en la rutina · ▼ marcó Pesado. El socio ya lo ve como sugerencia en su sesión.</span>}
        </div>
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
