import PendingButton from '@/components/PendingButton';
import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { minutes, raiseSignals, todaysPlan, weightLabel } from '@/lib/data';
import { DIAS, DIAS_CORTO, addDays, corta, dia2, today, weekdayOf } from '@/lib/dates';
import { Arrow, Back, Check, Chevron, Music } from '@/components/Icons';
import { q } from '@/lib/db';
import { startPastSession, startSession } from '../sesion/actions';

type Log = { session_id: number; date: string; name: string; kind: string; kg: string | null; reps: number | null; minutes: number | null };

const isIso = (v?: string) => !!v && /^\d{4}-\d{2}-\d{2}$/.test(v);

const SPOTIFY = process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST || 'https://open.spotify.com/search/workout';

export default async function Rutina({ searchParams }: { searchParams: { dia?: string; semana?: string } }) {
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
  const t = today();
  const thisMonday = addDays(t, 1 - wd);
  const monday = isIso(searchParams.semana) ? addDays(searchParams.semana!, 1 - weekdayOf(searchParams.semana!)) : thisMonday;
  const offset = Math.round((new Date(monday).getTime() - new Date(thisMonday).getTime()) / (7 * 86400000));
  const pick = Number(searchParams.dia) || (offset === 0 ? (hoy ?? proximo)!.weekday : days[0].weekday);
  const day = days.find((d) => d.weekday === pick) ?? days[0];
  const date = addDays(monday, day.weekday - 1);
  const isToday = date === t;
  const isPast = date < t;
  const thisWeek = offset === 0;

  // Sesiones terminadas de esa semana (para marcar los días y mostrar lo que hizo)
  const logs = await q<Log>(
    `select s.id as session_id, to_char(s.date,'YYYY-MM-DD') as date, e.name, i.kind, l.kg::text as kg, l.reps, l.minutes
       from sessions s
       left join set_logs l on l.session_id = s.id and l.done
       left join day_items i on i.id = l.item_id
       left join exercises e on e.id = i.exercise_id
      where s.user_id = $1 and s.finished_at is not null and s.date between $2 and $3
      order by s.date, s.id, i.position, l.set_no`,
    [user.id, monday, addDays(monday, 6)]
  );
  const doneDates = new Set(logs.map((l) => l.date));
  const hecho: { name: string; kind: string; kg: string | null; reps: (number | null)[]; minutes: number | null }[] = [];
  for (const l of logs.filter((x) => x.date === date && x.name)) {
    const last = hecho[hecho.length - 1];
    if (last && last.name === l.name) last.reps.push(l.reps);
    else hecho.push({ name: l.name, kind: l.kind, kg: l.kg, reps: [l.reps], minutes: l.minutes });
  }
  const doneDay = doneDates.has(date);
  const ups = await raiseSignals(user.id, day.items, isPast ? addDays(date, -1) : undefined);
  const weekLabel = offset === 0 ? 'Esta semana' : offset === -1 ? 'Semana pasada' : offset === 1 ? 'Semana que viene' : `Semana del ${corta(monday)}`;
  const href = (m: string, d?: number) => `/rutina?semana=${m}${d ? `&dia=${d}` : ''}`;
  const ejercicios = day.items.filter((i) => i.kind === 'ejercicio');
  const cardio = day.items.filter((i) => i.kind === 'cardio');
  const total = ejercicios.reduce((a, i) => a + (i.sets ?? 0) * 2.5, 0) + cardio.reduce((a, c) => a + minutes(c.segments), 0);

  return (
    <main className="page tight" style={{ paddingBottom: 200 }}>
      <nav aria-label="Semanas" className="row" style={{ gap: 8 }}>
        <Link href={href(addDays(monday, -7), day.weekday)} className="icon-btn" aria-label="Semana anterior" style={{ marginLeft: -10 }}><Back size={22} /></Link>
        <span style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
          <span className="label" style={{ fontSize: 13 }}>{weekLabel}</span>
          <span className="caption muted">{corta(monday)} – {corta(addDays(monday, 6))}{!thisWeek && <> · <Link href="/rutina" className="link" style={{ fontSize: 12 }}>Volver a hoy</Link></>}</span>
        </span>
        <Link href={href(addDays(monday, 7), day.weekday)} className="icon-btn" aria-label="Semana siguiente" style={{ marginRight: -10 }}><Chevron size={22} color="var(--guante)" /></Link>
      </nav>
      <nav aria-label="Días" style={{ display: 'flex', gap: 6 }}>
        {days.map((d) => {
          const dd = addDays(monday, d.weekday - 1);
          const sel = d.weekday === day.weekday;
          const done = doneDates.has(dd);
          return (
            <Link key={d.id} href={href(monday, d.weekday)} aria-current={sel ? 'page' : undefined}
              aria-label={`${DIAS[d.weekday]} ${corta(dd)}${done ? ', hecho' : ''}`}
              style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0 7px', borderRadius: 4,
                background: sel ? 'var(--guante)' : 'var(--cuerda)', color: sel ? 'var(--lona)' : 'var(--campana)',
                boxShadow: dd === t && !sel ? 'inset 0 0 0 2px var(--guante)' : 'none' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.04em' }}>{DIAS_CORTO[d.weekday]}</span>
              <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 17, lineHeight: '20px', color: sel ? 'var(--lona)' : 'var(--guante)' }}>{Number(dia2(dd))}</span>
              <span style={{ height: 12, display: 'flex', alignItems: 'center' }}>{done && <Check size={12} color={sel ? 'var(--lona)' : 'var(--violeta-texto)'} />}</span>
            </Link>
          );
        })}
      </nav>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 6 }}>
        <div className="row">
          <span className="caption muted">{isToday ? 'Hoy' : `${DIAS[day.weekday]} ${corta(date)}`} · ~{Math.round(total / 5) * 5} min</span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Link href="/rutina/plan" className="link">Plan completo</Link>
            <a href={SPOTIFY} target="_blank" rel="noopener" className="link" style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Music color="var(--violeta-texto)" /> Música</a>
          </span>
        </div>
        <h1 className="title-lg">{isToday ? 'Rutina de hoy' : DIAS[day.weekday]}</h1>
        {isPast && <p className="caption muted">{doneDay ? 'Ya lo hiciste. Arriba de la rutina está lo que registraste.' : 'Esto te tocaba. No hay una sesión registrada ese día.'}</p>}
        {!isPast && !isToday && <p className="caption muted">Esto te toca el {DIAS[day.weekday].toLowerCase()} {corta(date)}.</p>}
        {day.subtitle && <p className="label brand" style={{ fontSize: 13, letterSpacing: '0.1em' }}>{day.subtitle}</p>}
      </div>

      {hecho.length > 0 && (
        <section className="card bg-venda" style={{ gap: 4, padding: '12px 14px 6px' }}>
          <div className="row" style={{ alignItems: 'baseline', paddingBottom: 4 }}>
            <span className="label brand">Lo que hiciste</span>
            <Link href={`/sesion/${logs.find((l) => l.date === date)?.session_id}`} className="link" style={{ fontSize: 13 }}>Corregir</Link>
          </div>
          {hecho.map((x, k) => (
            <div key={k} className="row" style={{ alignItems: 'baseline', gap: 12, padding: '7px 0', borderTop: '1px solid var(--linea)', fontSize: 13, color: 'var(--guante)' }}>
              <span>{x.name}</span>
              <span className="strong" style={{ whiteSpace: 'nowrap' }}>{x.kind === 'cardio' ? `${x.minutes ?? '—'} min` : `${x.kg != null ? `${Number(x.kg).toString().replace('.', ',')} kg · ` : ''}${x.reps.map((r) => r ?? '—').join('-')}`}</span>
            </div>
          ))}
        </section>
      )}

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
              {ups.get(e.id) && <span className={ups.get(e.id)!.dir === 'down' ? '' : 'brand'} style={{ fontSize: 12, fontWeight: 700, color: ups.get(e.id)!.dir === 'down' ? 'var(--alerta)' : undefined }}>{ups.get(e.id)!.dir === 'down' ? '▼ Probá bajar un poco' : '▲ Toca subir el peso'}</span>}
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

      {(isToday || (thisWeek && !isPast) || (isPast && !doneDay)) && (
        <div className="sticky-cta">
          <div>
            {isPast ? (
              <form action={startPastSession}>
                <input type="hidden" name="fecha" value={date} />
                <input type="hidden" name="dia" value={day.id} />
                <PendingButton className="btn btn-outline" style={{ width: '100%', background: 'var(--lona)' }}>Cargar la sesión del {corta(date)}</PendingButton>
              </form>
            ) : (
              <form action={startSession}>
                <input type="hidden" name="dia" value={day.id} />
                <PendingButton>{isToday ? (doneDay ? 'Repetir sesión' : 'Empezar sesión') : `Entrenar ${DIAS[day.weekday].toLowerCase()} hoy`} <Arrow /></PendingButton>
              </form>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
