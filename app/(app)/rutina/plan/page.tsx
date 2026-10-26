import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { minutes, raiseSignals, routineDays, weightLabel } from '@/lib/data';
import { DIAS, DIAS_CORTO, mesLargo, toIso, today, weekdayOf } from '@/lib/dates';
import BackBar from '@/components/BackBar';
import { Arrow } from '@/components/Icons';

const dur = (min: number) => (Number.isInteger(min) ? `${min}′` : `${Math.round(min * 60)}″`);

/** La rutina completa de la semana, como el PDF de la entrenadora. */
export default async function Plan() {
  const user = await requireUser();
  const [days, rt] = await Promise.all([
    routineDays(user.id),
    one<{ title: string; objective: string | null; created_at: Date }>('select title, objective, created_at from routines where user_id = $1 and active order by id desc limit 1', [user.id]),
  ]);
  if (!days.length || !rt) {
    return (
      <main className="page">
        <BackBar href="/" label="Volver a Inicio" />
        <h1 className="title-lg">Tu plan</h1>
        <p className="muted">Todavía no tenés una rutina asignada.</p>
        <Link href="/pedir" className="btn btn-primary">Pedir rutina <Arrow /></Link>
      </main>
    );
  }
  const ups = await raiseSignals(user.id, days.flatMap((d) => d.items));
  const hoy = weekdayOf(today());
  const tipo = (d: (typeof days)[number]) => (d.items.some((i) => i.kind === 'cardio') ? 'Mixto' : 'Fuerza');

  return (
    <main className="page tight">
      <BackBar href="/rutina" label="Volver a la rutina" right={<span className="caption muted">Desde {mesLargo(toIso(rt.created_at))}</span>} />
      <header style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="label brand">{user.name} · {days.length} días</span>
        <h1 className="title-lg">Tu plan</h1>
        <p className="label" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{rt.title}</p>
      </header>

      {rt.objective && (
        <section className="card bg-cuerda" style={{ gap: 6 }}>
          <span className="label">Objetivos</span>
          <p className="caption" style={{ lineHeight: '19px' }}>{rt.objective}</p>
        </section>
      )}

      <nav aria-label="La semana" style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => (
          <a key={d.id} href={`#dia-${d.weekday}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', borderRadius: 4,
            background: d.weekday === hoy ? 'var(--guante)' : 'var(--cuerda)', color: d.weekday === hoy ? 'var(--lona)' : 'var(--guante)' }}>
            <span style={{ fontSize: 12, fontWeight: 800 }}>{DIAS_CORTO[d.weekday]}</span>
            <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.06em', opacity: 0.75 }}>{tipo(d).toUpperCase()}</span>
          </a>
        ))}
      </nav>

      {days.map((d, k) => {
        const ej = d.items.filter((i) => i.kind === 'ejercicio');
        const cardio = d.items.filter((i) => i.kind === 'cardio');
        return (
          <section key={d.id} id={`dia-${d.weekday}`} style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 10, scrollMarginTop: 16 }}>
            <Link href={`/rutina?dia=${d.weekday}`} className="row" style={{ alignItems: 'baseline', color: 'var(--guante)' }}>
              <span style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <span className="brand" style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 15 }}>{String(k + 1).padStart(2, '0')}</span>
                <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, textTransform: 'uppercase' }}>{DIAS[d.weekday]}</span>
                {d.weekday === hoy && <span className="badge bg-venda brand">Hoy</span>}
              </span>
              <span className="link" style={{ fontSize: 13 }}>Abrir</span>
            </Link>
            {d.subtitle && <span className="label brand" style={{ fontSize: 12, letterSpacing: '0.08em' }}>{d.subtitle}</span>}
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px 70px 54px', gap: 8, padding: '6px 0', fontSize: 10, fontWeight: 700, letterSpacing: '0.08em' }} className="muted">
                <span>EJERCICIO</span><span style={{ textAlign: 'center' }}>SERIES</span><span style={{ textAlign: 'right' }}>REPS</span><span style={{ textAlign: 'right' }}>PESO</span>
              </div>
              {ej.map((e) => {
                const up = ups.get(e.id);
                return (
                  <div key={e.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 34px 70px 54px', gap: 8, alignItems: 'baseline', padding: '8px 0', borderTop: '1px solid var(--linea)', fontSize: 14 }}>
                    <span style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                      <span className="strong" style={{ lineHeight: '18px' }}>{e.name}</span>
                      {up && <span style={{ fontSize: 11, fontWeight: 700, color: up.dir === 'down' ? 'var(--alerta)' : 'var(--violeta-texto)' }}>{up.dir === 'down' ? '▼ Bajar un poco' : '▲ Subir peso'}</span>}
                    </span>
                    <span style={{ textAlign: 'center', fontFamily: 'var(--font-archivo)', fontWeight: 800 }}>{e.sets ?? '—'}</span>
                    <span style={{ textAlign: 'right', fontWeight: 600 }}>{e.reps ?? '—'}</span>
                    <span style={{ textAlign: 'right' }} className="muted">{weightLabel(e.weight_kg)}</span>
                  </div>
                );
              })}
            </div>
            {cardio.map((c) => (
              <div key={c.id} className="card bg-cuerda" style={{ gap: 6, padding: '12px 14px' }}>
                <div className="row" style={{ alignItems: 'baseline' }}>
                  <span className="label">{c.name} · {minutes(c.segments)}′</span>
                  <span className="caption muted">al final</span>
                </div>
                <div aria-hidden="true" style={{ display: 'flex', gap: 2, height: 6 }}>
                  {(c.segments ?? []).map((s, i) => <span key={i} style={{ flex: s.min, background: s.label === 'Suave' ? 'var(--linea)' : 'var(--violeta)' }} />)}
                </div>
                <span className="caption muted">{c.note ?? (c.segments ?? []).map((s) => `${dur(s.min)} ${s.label.toLowerCase()}`).join(' · ')}</span>
              </div>
            ))}
            {d.note && <p className="caption muted" style={{ fontStyle: 'italic' }}>{d.note}</p>}
          </section>
        );
      })}

      <p className="caption muted" style={{ paddingTop: 8 }}>Tocá un día para abrirlo y empezar la sesión. ▲ y ▼ salen de lo que marcaste la última vez.</p>
    </main>
  );
}
