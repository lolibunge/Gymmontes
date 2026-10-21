import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { minutes, todaysPlan, weightLabel } from '@/lib/data';
import { DIAS, DIAS_CORTO } from '@/lib/dates';
import { Arrow, Music } from '@/components/Icons';
import { startSession } from '../sesion/actions';

const SPOTIFY = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST || 'https://open.spotify.com/search/workout';

export default async function Rutina({ searchParams }: { searchParams: { dia?: string } }) {
  const user = await requireUser();
  const { days, hoy, proximo, wd } = await todaysPlan(user.id);
  if (!days.length) {
    return (
      <main className="page">
        <h1 className="title-lg">Tu rutina</h1>
        <p className="muted">Todavía no tenés una rutina asignada.</p>
        <Link href="/pedir" className="btn btn-primary">Pedir rutina <Arrow /></Link>
      </main>
    );
  }
  const pick = Number(searchParams.dia) || (hoy ?? proximo)!.weekday;
  const day = days.find((d) => d.weekday === pick) ?? days[0];
  const isToday = day.weekday === wd;
  const ejercicios = day.items.filter((i) => i.kind === 'ejercicio');
  const cardio = day.items.filter((i) => i.kind === 'cardio');
  const total = ejercicios.reduce((a, i) => a + (i.sets ?? 0) * 2.5, 0) + cardio.reduce((a, c) => a + minutes(c.segments), 0);

  return (
    <main className="page tight" style={{ paddingBottom: 200 }}>
      <nav aria-label="Días" style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => (
          <Link key={d.id} href={`/rutina?dia=${d.weekday}`} aria-current={d.weekday === day.weekday ? 'page' : undefined}
            style={{ flex: 1, textAlign: 'center', padding: '9px 0', borderRadius: 4, fontSize: 12, fontWeight: 700,
              background: d.weekday === day.weekday ? 'var(--guante)' : 'var(--cuerda)',
              color: d.weekday === day.weekday ? 'var(--lona)' : 'var(--campana)' }}>
            {DIAS_CORTO[d.weekday]}
          </Link>
        ))}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
        <div className="row">
          <span className="caption muted">{isToday ? 'Hoy' : DIAS[day.weekday]} · ~{Math.round(total / 5) * 5} min</span>
          <a href={SPOTIFY} target="_blank" rel="noopener" className="link" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Music color="var(--violeta-texto)" /> Música</a>
        </div>
        <h1 className="title-lg">{isToday ? 'Rutina de hoy' : DIAS[day.weekday]}</h1>
        {day.subtitle && <p className="label brand" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{day.subtitle}</p>}
      </div>

      <section aria-label="Ejercicios">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, paddingBottom: 6, fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }} className="muted">
          <span style={{ width: 22 }} />
          <span style={{ flex: 1 }}>EJERCICIO</span>
          <span style={{ width: 70, textAlign: 'right' }}>SERIES</span>
          <span style={{ width: 58, textAlign: 'right' }}>PESO</span>
        </div>
        {ejercicios.map((e, n) => (
          <Link key={e.id} href={`/ejercicio/${e.slug}`} style={{ display: 'flex', alignItems: 'center', gap: 12, minHeight: 54, padding: '8px 0', borderTop: '1px solid var(--linea)', color: 'var(--guante)' }}>
            <span style={{ width: 22, fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 15 }} className="brand">{n + 1}</span>
            <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong" style={{ lineHeight: '19px' }}>{e.name}</span>
              {e.note && <span className="caption muted">{e.note}</span>}
              {e.raise_weight && <span className="brand" style={{ fontSize: 12, fontWeight: 700 }}>▲ Hoy subí el peso</span>}
            </span>
            <span style={{ width: 70, textAlign: 'right', fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 14 }}>{e.sets} × {e.reps}</span>
            <span style={{ width: 58, textAlign: 'right', fontSize: 14 }} className="muted">{weightLabel(e.weight_kg)}</span>
          </Link>
        ))}
      </section>

      {cardio.map((c) => {
        const segs = c.segments ?? [];
        return (
          <section key={c.id} className="card bg-cuerda">
            <div className="row" style={{ alignItems: 'baseline' }}>
              <span className="label">{c.name} · al final</span>
              <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 800 }}>{minutes(segs)}′</span>
            </div>
            <div aria-hidden="true" style={{ display: 'flex', gap: 3, height: 8 }}>
              {segs.map((s, i) => <span key={i} style={{ flex: s.min, background: s.label === 'Suave' ? 'var(--linea)' : 'var(--violeta)' }} />)}
            </div>
            {c.note && <span className="caption muted">{c.note}</span>}
          </section>
        );
      })}

      {day.note && <p className="caption muted" style={{ fontStyle: 'italic' }}>{day.note}</p>}
      <p className="caption muted">Tocá un ejercicio para ver cómo se hace.</p>

      <div className="sticky-cta">
        <div>
          <form action={startSession}>
            <input type="hidden" name="dia" value={day.id} />
            <button className="btn btn-primary">{isToday ? 'Empezar sesión' : `Entrenar ${DIAS[day.weekday].toLowerCase()} hoy`} <Arrow /></button>
          </form>
        </div>
      </div>
    </main>
  );
}
