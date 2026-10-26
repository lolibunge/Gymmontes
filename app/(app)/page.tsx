import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { challenge, membership, minutes, monthCount, news, todaysPlan, weekDone } from '@/lib/data';
import { DIAS, DIAS_CORTO, dia2, mesCorto } from '@/lib/dates';
import { Arrow, Check, Clock } from '@/components/Icons';
import { startSession } from './sesion/actions';

export default async function Inicio() {
  const user = await requireUser();
  const [{ days, hoy, proximo, wd }, done, cuota, reto, hechas, novedades] = await Promise.all([
    todaysPlan(user.id), weekDone(user.id), membership(user.id), challenge(), monthCount(user.id), news(2),
  ]);
  const plan = hoy ?? proximo;
  const ejercicios = plan?.items.filter((i) => i.kind === 'ejercicio') ?? [];
  const series = ejercicios.reduce((a, i) => a + (i.sets ?? 0), 0);
  const cardio = plan?.items.find((i) => i.kind === 'cardio');
  const yaHoy = hoy ? done.has(wd) : false;

  return (
    <main className="page">
      <header className="row">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span aria-hidden="true" style={{ width: 10, height: 10, background: 'var(--violeta)' }} />
          <span className="label" style={{ fontWeight: 900, fontSize: 15, letterSpacing: '0.08em' }}>GYM MONTES</span>
        </div>
        <Link href="/perfil" aria-label="Tu perfil" style={{ width: 36, height: 36, borderRadius: 999, background: 'var(--guante)', color: 'var(--lona)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-archivo)', fontWeight: 800 }}>
          {user.name.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      {cuota && cuota.estado !== 'al día' && (
        <Link href="/perfil" className={`card ${cuota.estado === 'vencida' ? 'bg-alerta' : 'bg-venda'}`} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', color: cuota.estado === 'vencida' ? 'var(--alerta)' : 'var(--guante)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Clock color={cuota.estado === 'vencida' ? 'var(--alerta)' : 'var(--violeta-texto)'} />
            <span className="strong" style={{ fontSize: 14 }}>
              {cuota.estado === 'vencida' ? 'Tu cuota está vencida' : cuota.left === 0 ? 'Tu cuota vence hoy' : `Tu cuota vence en ${cuota.left} ${cuota.left === 1 ? 'día' : 'días'}`}
            </span>
          </span>
          <span className="link">Ver</span>
        </Link>
      )}

      <section style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <p className="muted">Hola {user.name}, {!plan ? 'te damos la bienvenida a GYM MONTES' : hoy ? (yaHoy ? 'ya entrenaste hoy' : 'hoy te toca') : 'hoy descansás. Lo próximo es'}</p>
        <h1 className="display" style={!plan ? { fontSize: 44, lineHeight: '42px' } : undefined}>{plan ? DIAS[plan.weekday] : 'Empecemos'}</h1>
        {plan?.subtitle && <p className="label brand" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{plan.subtitle}</p>}
      </section>

      {plan ? (
        <section className="card bg-esquina" style={{ gap: 18, padding: 20 }}>
          <div style={{ display: 'flex', gap: 28 }}>
            <div style={{ display: 'flex', flexDirection: 'column' }}><span className="number">{ejercicios.length}</span><span className="caption" style={{ color: '#bdbdbd' }}>ejercicios</span></div>
            <div style={{ display: 'flex', flexDirection: 'column' }}><span className="number">{series}</span><span className="caption" style={{ color: '#bdbdbd' }}>series</span></div>
            {cardio && <div style={{ display: 'flex', flexDirection: 'column' }}><span className="number">{minutes(cardio.segments)}′</span><span className="caption" style={{ color: '#bdbdbd' }}>de bici</span></div>}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href={`/rutina?dia=${plan.weekday}`} className="btn btn-outline" style={{ flex: 1, color: '#f5f5f5', boxShadow: 'inset 0 0 0 1.5px #5a5a5a', fontSize: 14 }}>Ver rutina</Link>
            {hoy && (
              <form action={startSession} style={{ flex: 1.3, display: 'flex' }}>
                <input type="hidden" name="dia" value={hoy.id} />
                <button className="btn btn-primary" style={{ fontSize: 14 }}>{yaHoy ? 'Repetir' : 'Empezar'} <Arrow /></button>
              </form>
            )}
          </div>
        </section>
      ) : (
        <section className="card bg-esquina" style={{ gap: 14, padding: 20 }}>
          <span className="label" style={{ color: '#d69ae8' }}>Paso 1</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>Pedí tu rutina</span>
          <span className="caption" style={{ color: '#bdbdbd' }}>Contale a la entrenadora qué buscás y cuántos días podés venir. Cuando la arme, aparece acá con tus ejercicios, series y pesos.</span>
          <Link href="/pedir" className="btn btn-primary">Pedir rutina <Arrow /></Link>
        </section>
      )}

      {days.length > 0 && (
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <h2 className="label">Tu semana</h2>
            <span className="caption muted">{days.filter((d) => done.has(d.weekday)).length} de {days.length} hechas</span>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {days.map((d) => {
              const isDone = done.has(d.weekday);
              const isToday = d.weekday === wd;
              const style: React.CSSProperties = isDone
                ? { background: 'var(--violeta)', color: 'var(--on-violeta)' }
                : isToday
                  ? { background: 'var(--lona)', boxShadow: 'inset 0 0 0 2px var(--guante)' }
                  : { background: 'var(--cuerda)', color: 'var(--campana)' };
              return (
                <Link key={d.id} href={`/rutina?dia=${d.weekday}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '10px 0', borderRadius: 4, color: 'var(--guante)', ...style }}>
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{DIAS_CORTO[d.weekday]}</span>
                  {isDone ? <Check size={16} color="var(--on-violeta)" /> : <span style={{ fontSize: 11, fontWeight: 600, lineHeight: '16px' }}>{isToday ? 'Hoy' : ' '}</span>}
                </Link>
              );
            })}
          </div>
        </section>
      )}

      {reto && (
        <Link href="/comunidad" className="card bg-venda" style={{ color: 'var(--guante)' }}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <span className="label brand">Reto del mes</span>
            <span className="caption strong">{Math.min(hechas, reto.target)} de {reto.target}</span>
          </div>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 20, lineHeight: '22px', textTransform: 'uppercase' }}>{reto.title}</span>
          <div className="segbar" aria-hidden="true">
            {Array.from({ length: reto.target }).map((_, i) => <span key={i} className={i < hechas ? 'on' : ''} />)}
          </div>
        </Link>
      )}

      {novedades.length > 0 && (
        <section>
          <div className="row" style={{ alignItems: 'baseline', paddingBottom: 8 }}>
            <h2 className="label">Novedades del gym</h2>
            <Link href="/comunidad" className="link">Ver todas</Link>
          </div>
          {novedades.map((n) => (
            <div key={n.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: '1px solid var(--linea)' }}>
              <span style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 20 }}>{dia2(n.date)}</span>
                <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }} className="muted">{mesCorto(n.date)}</span>
              </span>
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="strong">{n.title}</span>
                {n.body && <span className="caption muted">{n.body}</span>}
              </span>
            </div>
          ))}
        </section>
      )}
    </main>
  );
}
