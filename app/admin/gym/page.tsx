import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { addDays, corta, mesLargo, today } from '@/lib/dates';
import { addNews, createRaffle, deleteNews, drawWinner, saveChallenge, saveCobros } from '../actions';
import { METHOD_LABEL, paySettings, pendingPayments } from '@/lib/payments';
import PaymentCard from '../PaymentCard';

const TABS = ['cobros', 'maquinas', 'novedades', 'reto', 'sorteo'] as const;
const LABEL: Record<string, string> = { cobros: 'Cobros', maquinas: 'Máquinas', novedades: 'Novedades', reto: 'Reto', sorteo: 'Sorteo' };

export default async function Gym({ searchParams }: { searchParams: { tab?: string; guardado?: string; error?: string } }) {
  await requireOwner();
  const tab = (TABS as readonly string[]).includes(searchParams.tab ?? '') ? searchParams.tab! : 'novedades';
  const t = today();
  const mes = t.slice(0, 7);
  const next = addDays(`${mes}-28`, 7).slice(0, 7);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <h1 className="title-lg">Tu gym</h1>
      <nav role="tablist" aria-label="Secciones" style={{ display: 'flex', gap: 4, padding: 4, borderRadius: 8, background: 'var(--cuerda)' }}>
        {TABS.map((k) => (
          <Link key={k} href={`/admin/gym?tab=${k}`} role="tab" aria-selected={tab === k}
            style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 12.5,
              fontWeight: tab === k ? 600 : 500, background: tab === k ? 'var(--lona)' : 'transparent', color: tab === k ? 'var(--guante)' : 'var(--campana)',
              boxShadow: tab === k ? 'inset 0 0 0 1.5px var(--linea)' : 'none' }}>{LABEL[k]}</Link>
        ))}
      </nav>
      {tab === 'cobros' && <Cobros guardado={!!searchParams.guardado} error={searchParams.error} />}
      {tab === 'maquinas' && <Maquinas />}
      {tab === 'novedades' && <Novedades />}
      {tab === 'reto' && <Reto mes={mes} next={next} />}
      {tab === 'sorteo' && <Sorteo hoy={t} />}
    </main>
  );
}

async function Novedades() {
  const items = await q<{ id: number; date: string; title: string; body: string | null }>(
    `select id, to_char(date,'YYYY-MM-DD') as date, title, body from news order by date desc, id desc limit 30`);
  return (
    <>
      <form action={addNews} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
        <span className="label">Nueva novedad</span>
        <label><span className="sr">Título</span><input className="input" name="title" required placeholder="Ej.: Feriado 2/11: abrimos de 9 a 13 h" /></label>
        <label><span className="sr">Detalle</span><textarea className="input" name="body" rows={2} placeholder="Detalle (opcional)" /></label>
        <label className="field"><span>Fecha que se muestra</span><input className="input" type="date" name="date" defaultValue={today()} /></label>
        <button className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 14 }}>Publicar</button>
      </form>
      <section>
        <h2 className="label" style={{ paddingBottom: 6 }}>Publicadas · las ven todos los socios</h2>
        {items.length === 0 && <p className="caption muted">Todavía no hay novedades.</p>}
        {items.map((n) => (
          <div key={n.id} className="list-row">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">{n.title}</span>
              <span className="caption muted">{corta(n.date)}{n.body ? ` · ${n.body}` : ''}</span>
            </span>
            <form action={deleteNews}><input type="hidden" name="id" value={n.id} /><button className="link" style={{ color: 'var(--campana)', fontSize: 13 }}>Borrar</button></form>
          </div>
        ))}
      </section>
    </>
  );
}

async function Reto({ mes, next }: { mes: string; next: string }) {
  const [actual, proximo] = await Promise.all([
    one<{ title: string; target: number; description: string | null }>('select title, target, description from challenges where month = $1', [mes]),
    one<{ title: string; target: number; description: string | null }>('select title, target, description from challenges where month = $1', [next]),
  ]);
  const cumplieron = actual
    ? await one<{ n: number; activos: number }>(
        `select count(*) filter (where c >= $2)::int as n, count(*)::int as activos from (
           select user_id, count(*) as c from sessions where finished_at is not null and to_char(date,'YYYY-MM') = $1 group by user_id) s`, [mes, actual.target])
    : null;
  const form = (month: string, data: typeof actual, label: string) => (
    <form action={saveChallenge} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
      <input type="hidden" name="month" value={month} />
      <span className="label">{label}</span>
      <label className="field"><span>Título</span><input className="input" name="title" required defaultValue={data?.title ?? ''} placeholder="Ej.: 15 sesiones en el mes" /></label>
      <label className="field"><span>Meta (sesiones)</span><input className="input" name="target" type="number" min={1} max={31} required defaultValue={data?.target ?? 12} /></label>
      <label className="field"><span>Mensaje para los socios</span><textarea className="input" name="description" rows={2} defaultValue={data?.description ?? ''} /></label>
      <button className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 14 }}>{data ? 'Guardar cambios' : 'Programar reto'}</button>
    </form>
  );
  return (
    <>
      {actual ? (
        <section className="card bg-violeta" style={{ padding: 18 }}>
          <span className="label">Reto de {mesLargo(`${mes}-01`)} · en curso</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{actual.title}</span>
          <span className="caption">{cumplieron?.activos ?? 0} {cumplieron?.activos === 1 ? 'socio entrenó' : 'socios entrenaron'} este mes · {cumplieron?.n ?? 0} ya lo cumplieron</span>
        </section>
      ) : form(mes, null, `Reto de ${mesLargo(`${mes}-01`)}`)}
      {actual && form(mes, actual, `Editar reto de ${mesLargo(`${mes}-01`)}`)}
      {form(next, proximo, `Reto de ${mesLargo(`${next}-01`)}`)}
    </>
  );
}

async function Sorteo({ hoy }: { hoy: string }) {
  const r = await one<{ id: number; title: string; closes_on: string; winner: string | null }>(
    `select r.id, r.title, to_char(r.closes_on,'YYYY-MM-DD') as closes_on, w.name as winner
       from raffles r left join users w on w.id = r.winner_id order by r.id desc limit 1`);
  const entries = r ? await q<{ name: string; email: string }>(
    `select u.name, u.email from raffle_entries e join users u on u.id = e.user_id where e.raffle_id = $1 order by u.name`, [r.id]) : [];
  const abierto = r && !r.winner && r.closes_on >= hoy;
  return (
    <>
      {r && (
        <section className="card bg-esquina" style={{ padding: 18 }}>
          <span className="label" style={{ color: '#d69ae8' }}>{r.winner ? 'Sorteo terminado' : abierto ? 'Sorteo activo' : 'Sorteo cerrado'}</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{r.title}</span>
          <span className="caption" style={{ color: '#bdbdbd' }}>{r.winner ? `Ganó ${r.winner}` : `${abierto ? 'Cierra' : 'Cerró'} el ${corta(r.closes_on)}`} · {entries.length} {entries.length === 1 ? 'anotado' : 'anotados'}</span>
          {!r.winner && entries.length > 0 && (
            <form action={drawWinner}>
              <input type="hidden" name="id" value={r.id} />
              <button className="btn" style={{ justifyContent: 'center', background: '#f5f5f5', color: '#111', fontSize: 13 }}>Sortear ganador</button>
            </form>
          )}
        </section>
      )}
      {r && entries.length > 0 && (
        <section>
          <h2 className="label" style={{ paddingBottom: 6 }}>Anotados</h2>
          {entries.map((e) => (
            <div key={e.email} className="list-row"><span className="strong">{e.name}</span><span className="caption muted">{e.email}</span></div>
          ))}
        </section>
      )}
      {!abierto && (
        <form action={createRaffle} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10 }}>
          <span className="label">Nuevo sorteo</span>
          <label className="field"><span>Premio</span><input className="input" name="title" required placeholder="Ej.: Un mes gratis" /></label>
          <label className="field"><span>Cierra el</span><input className="input" type="date" name="closes_on" required min={hoy} /></label>
          <button className="btn btn-primary" style={{ justifyContent: 'center', fontSize: 14 }}>Abrir sorteo</button>
        </form>
      )}
    </>
  );
}

async function Cobros({ guardado, error }: { guardado: boolean; error?: string }) {
  const [cfg, pend, recent] = await Promise.all([
    paySettings(), pendingPayments(),
    q<{ id: number; name: string; method: string; paid_on: string; status: string }>(
      `select p.id, u.name, p.method, to_char(p.paid_on,'YYYY-MM-DD') as paid_on, p.status from payment_reports p join users u on u.id = p.user_id
        where p.status in ('confirmado','rechazado') order by p.reviewed_at desc limit 8`),
  ]);
  return (
    <>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h2 className="label">Pagos para confirmar</h2>
        {pend.length === 0 && <p className="caption muted">Nadie avisó un pago todavía. Cuando un socio toque "Ya transferí" o "Ya pagué", aparece acá.</p>}
        {pend.map((p) => <PaymentCard key={p.id} p={p} back="/admin/gym?tab=cobros" />)}
      </section>

      <form action={saveCobros} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 12 }}>
        <div className="row" style={{ alignItems: 'baseline' }}>
          <h2 className="label">Cómo cobrás</h2>
          {guardado && <span className="caption brand strong">Guardado</span>}
        </div>
        <label className="field"><span>Cuota mensual</span>
          <input className="input" name="fee" defaultValue={cfg.fee} placeholder="Ej.: $ 1.200" />
        </label>
        <label className="field"><span>Pase por día (opcional)</span>
          <input className="input" name="day_fee" defaultValue={cfg.dayFee} placeholder="Ej.: $ 200" />
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 15, fontWeight: 600 }}>
          <input type="checkbox" name="cash" defaultChecked={cfg.cash} style={{ width: 20, height: 20 }} /> Efectivo en recepción
        </label>
        <label className="field"><span>Aclaración del efectivo (opcional)</span>
          <input className="input" name="cash_note" defaultValue={cfg.cashNote} placeholder="Ej.: de lunes a viernes de 7 a 21 h" />
        </label>
        <label className="field"><span>Datos para depósito o transferencia</span>
          <textarea className="input" name="bank" rows={4} defaultValue={cfg.bank} placeholder={'Banco: BROU\nCuenta: 000000000-00000\nTitular: ...\nEn el concepto poné tu nombre'} />
        </label>
        <label className="field"><span>Link de cobro de Mercado Pago</span>
          <input className="input" name="mp_link" defaultValue={cfg.mpLink} placeholder="https://mpago.la/…" inputMode="url" />
        </label>
        {error === 'link' && <p className="caption" style={{ color: 'var(--alerta)' }}>El link tiene que empezar con https://</p>}
        <p className="caption muted">El link lo creás en tu cuenta de Mercado Pago (cobrar con link de pago, por el monto de la cuota). Lo que dejes vacío no aparece para los socios.</p>
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar</button>
      </form>

      {recent.length > 0 && (
        <section>
          <h2 className="label" style={{ paddingBottom: 6 }}>Últimos revisados</h2>
          {recent.map((r) => (
            <div key={r.id} className="list-row">
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span className="strong">{r.name}</span>
                <span className="caption muted">{METHOD_LABEL[r.method]} · {corta(r.paid_on)}</span>
              </span>
              <span className="badge" style={{ background: 'var(--cuerda)', color: r.status === 'confirmado' ? 'var(--guante)' : 'var(--alerta)' }}>{r.status === 'confirmado' ? 'Confirmado' : 'No llegó'}</span>
            </div>
          ))}
        </section>
      )}
    </>
  );
}

async function Maquinas() {
  const rows = await q<{ id: number; name: string; machine_code: string | null; steps: number; video: boolean; uso: number }>(
    `select e.id, e.name, e.machine_code, jsonb_array_length(e.steps) as steps, e.video_url is not null as video,
            (select count(*)::int from day_items i join routine_days d on d.id = i.day_id join routines r on r.id = d.routine_id
              where i.exercise_id = e.id and r.active and not i.removed) as uso
       from exercises e where e.slug <> 'bicicleta'
      order by (e.machine_code is null), e.machine_code, uso desc, e.name`);
  const faltan = rows.filter((r) => r.uso > 0 && (!r.steps || !r.video)).length;
  return (
    <section style={{ display: 'flex', flexDirection: 'column' }}>
      <p className="caption muted" style={{ paddingBottom: 10 }}>
        Cargá cómo se hace cada ejercicio y el video. Con un código de máquina (M01, M02…) se genera el QR para pegar en la máquina.
        {faltan > 0 && <> <b style={{ color: 'var(--guante)' }}>{faltan} {faltan === 1 ? 'ejercicio de las rutinas no tiene' : 'ejercicios de las rutinas no tienen'} pasos o video.</b></>}
      </p>
      {rows.map((r) => (
        <Link key={r.id} href={`/admin/ejercicios/${r.id}`} className="list-row">
          <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 40, flexShrink: 0, textAlign: 'center', padding: '4px 0', borderRadius: 4, fontSize: 12, fontWeight: 800,
              background: r.machine_code ? 'var(--guante)' : 'var(--cuerda)', color: r.machine_code ? 'var(--lona)' : 'var(--campana)' }}>{r.machine_code ?? '—'}</span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">{r.name}</span>
              <span className="caption muted">
                {r.steps ? `${r.steps} ${r.steps === 1 ? 'paso' : 'pasos'}` : <span style={{ color: 'var(--alerta)' }}>sin pasos</span>}
                {' · '}{r.video ? 'video ✓' : 'sin video'}{r.uso ? ` · en ${r.uso} ${r.uso === 1 ? 'rutina' : 'rutinas'}` : ''}
              </span>
            </span>
          </span>
          <span className="link" style={{ fontSize: 13 }}>Editar</span>
        </Link>
      ))}
    </section>
  );
}
