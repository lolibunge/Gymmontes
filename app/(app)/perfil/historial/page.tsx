import Link from 'next/link';
import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { DIAS, dia2, mesCorto, today, weekdayOf } from '@/lib/dates';
import { routineDays } from '@/lib/data';
import { startPastSession } from '../../sesion/actions';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

type S = { id: number; date: string; title: string | null; subtitle: string | null };
type L = { session_id: number; position: number; name: string; kind: string; reps_target: string | null; kg: string | null; reps: number | null; minutes: number | null; raise: boolean };

export default async function Historial({ searchParams }: { searchParams: { ok?: string; error?: string; fecha?: string } }) {
  const u = await requireUser();
  const sessions = await q<S>(
    `select s.id, to_char(s.date,'YYYY-MM-DD') as date, d.title, d.subtitle from sessions s
       left join routine_days d on d.id = s.day_id
      where s.user_id = $1 and s.finished_at is not null order by s.date desc, s.id desc limit 40`,
    [u.id]
  );
  const logs = sessions.length
    ? await q<L>(
        `select l.session_id, i.position, e.name, i.kind, i.reps as reps_target, l.kg::text as kg, l.reps, l.minutes, i.raise_weight as raise
           from set_logs l join day_items i on i.id = l.item_id join exercises e on e.id = i.exercise_id
          where l.session_id = any($1) and l.done order by l.session_id, i.position, l.set_no`,
        [sessions.map((s) => s.id)]
      )
    : [];
  const open = Number(searchParams.ok) || sessions[0]?.id;
  const days = await routineDays(u.id);

  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Volver a Perfil" right={<span className="caption muted">{plural(sessions.length, 'sesión', 'sesiones')}</span>} />
      <h1 className="title">Historial</h1>
      {searchParams.ok && <p className="card bg-venda strong brand" style={{ padding: '12px 14px' }}>¡Sesión guardada! Buen trabajo.</p>}
      {days.length > 0 && (
        <details className="card bg-cuerda" style={{ padding: 0 }} open={!!searchParams.error}>
          <summary className="row" style={{ listStyle: 'none', cursor: 'pointer', padding: '14px 16px' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong">Cargar una sesión pasada</span>
              <span className="caption muted">Para lo que entrenaste antes de usar la app</span>
            </span>
            <span className="link" aria-hidden="true">＋</span>
          </summary>
          <form action={startPastSession} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px 16px' }}>
            {searchParams.error === 'fecha' && <p className="caption" style={{ color: 'var(--alerta)' }}>Elegí una fecha de hoy o anterior.</p>}
            {searchParams.error === 'dia' && <p className="caption" style={{ color: 'var(--alerta)' }}>Ese día no está en tu rutina. Elegí qué día de la rutina hiciste.</p>}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              <label className="field">
                <span>Fecha</span>
                <input className="input" type="date" name="fecha" required max={today()} defaultValue={searchParams.fecha} />
              </label>
              <label className="field">
                <span>Día de la rutina</span>
                <select className="input" name="dia" defaultValue="">
                  <option value="">Automático</option>
                  {days.map((d) => <option key={d.id} value={d.id}>{DIAS[d.weekday]}</option>)}
                </select>
              </label>
            </div>
            <button className="btn btn-primary" style={{ minHeight: 48 }}>Cargar sesión <span aria-hidden="true">→</span></button>
          </form>
        </details>
      )}
      {sessions.length === 0 && <p className="muted">Todavía no terminaste ninguna sesión. Cuando termines una, aparece acá con todos tus pesos.</p>}
      <div>
        {sessions.map((s) => {
          const mine = logs.filter((l) => l.session_id === s.id);
          const byEx: { name: string; kind: string; kg: string | null; reps: (number | null)[]; minutes: number | null; raise: boolean }[] = [];
          for (const l of mine) {
            const last = byEx[byEx.length - 1];
            if (last && last.name === l.name) last.reps.push(l.reps);
            else byEx.push({ name: l.name, kind: l.kind, kg: l.kg, reps: [l.reps], minutes: l.minutes, raise: l.raise });
          }
          const series = mine.filter((l) => l.kind === 'ejercicio').length;
          return (
            <details key={s.id} open={s.id === open} style={{ borderTop: '1px solid var(--linea)' }}>
              <summary style={{ listStyle: 'none', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 0', cursor: 'pointer' }}>
                <span style={{ width: 44, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 22, lineHeight: '24px' }}>{dia2(s.date)}</span>
                  <span className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>{mesCorto(s.date)}</span>
                </span>
                <span style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span className="strong">{s.subtitle ?? s.title ?? 'Sesión'}</span>
                  <span className="caption muted">{DIAS[weekdayOf(s.date)]} · {plural(byEx.filter((x) => x.kind === 'ejercicio').length, 'ejercicio', 'ejercicios')} · {plural(series, 'serie', 'series')}</span>
                </span>
              </summary>
              <div className="bg-cuerda" style={{ borderRadius: 4, padding: '4px 14px 10px', marginBottom: 14 }}>
                {byEx.length === 0 && <p className="caption muted" style={{ padding: '9px 0' }}>Sin series registradas.</p>}
                {byEx.map((x, k) => (
                  <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12, padding: '9px 0', fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{x.name}</span>
                    <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap' }}>
                      {x.kind === 'cardio' ? `${x.minutes ?? '—'} min` : `${x.kg != null ? `${Number(x.kg)} kg · ` : ''}${x.reps.map((r) => r ?? '—').join('-')}`}
                    </span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 6, borderTop: '1px solid var(--linea)' }}>
                  <Link href={`/sesion/${s.id}`} className="link" style={{ fontSize: 13, padding: '6px 0' }}>Corregir esta sesión</Link>
                </div>
              </div>
            </details>
          );
        })}
      </div>
    </main>
  );
}
