import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { addDays, corta, mesLargo, today } from '@/lib/dates';
import { addNews, createRaffle, deleteNews, drawWinner, saveChallenge } from '../actions';

const TABS = ['novedades', 'reto', 'sorteo'] as const;
const LABEL: Record<string, string> = { novedades: 'Novedades', reto: 'Reto', sorteo: 'Sorteo' };

export default async function Gym({ searchParams }: { searchParams: { tab?: string } }) {
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
            style={{ flex: 1, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 4, fontSize: 14,
              fontWeight: tab === k ? 600 : 500, background: tab === k ? 'var(--lona)' : 'transparent', color: tab === k ? 'var(--guante)' : 'var(--campana)',
              boxShadow: tab === k ? 'inset 0 0 0 1.5px var(--linea)' : 'none' }}>{LABEL[k]}</Link>
        ))}
      </nav>
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
