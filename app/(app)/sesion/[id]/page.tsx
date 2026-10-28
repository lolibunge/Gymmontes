import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { dayById } from '@/lib/data';
import { addDays, today, weekdayOf } from '@/lib/dates';
import { warmupSettings } from '@/lib/warmup';
import SessionRunner, { type RunnerItem } from './SessionRunner';

type Prev = { exercise_id: number; date: string; set_no: number; kg: string | null; reps: number | null };

export default async function Sesion({ params, searchParams }: { params: { id: string }; searchParams: { paso?: string } }) {
  const user = await requireUser();
  const s = await one<{ id: number; day_id: number; date: string; finished: boolean }>(
    `select id, day_id, to_char(date,'YYYY-MM-DD') as date, finished_at is not null as finished from sessions where id = $1 and user_id = $2`,
    [Number(params.id), user.id]
  );
  if (!s) notFound();
  const day = await dayById(user.id, s.day_id);
  if (!day) notFound();
  const exIds = day.items.filter((i) => i.kind === 'ejercicio').map((i) => i.exercise_id);
  // Todo en paralelo y en pocas consultas: la pantalla abre más rápido con la señal del gym
  const [logs, feels, prevs, warm] = await Promise.all([
    q<{ item_id: number; set_no: number; kg: string | null; reps: number | null; minutes: number | null; done: boolean }>(
      'select item_id, set_no, kg::text as kg, reps, minutes, done from set_logs where session_id = $1', [s.id]),
    q<{ item_id: number; feel: 'liviano' | 'justo' | 'pesado' }>('select item_id, feel from set_feel where session_id = $1', [s.id]),
    // "La vez pasada" de cada ejercicio: la última sesión anterior con series hechas
    exIds.length ? q<Prev>(
      `with last as (
         select distinct on (i.exercise_id) i.exercise_id, s.id as session_id, to_char(s.date,'YYYY-MM-DD') as date
           from set_logs l join sessions s on s.id = l.session_id join day_items i on i.id = l.item_id
          where s.user_id = $1 and l.done and i.exercise_id = any($2) and s.id <> $3 and s.date <= $4::date
          order by i.exercise_id, s.date desc, s.id desc)
       select last.exercise_id, last.date, l.set_no, l.kg::text as kg, l.reps
         from last join set_logs l on l.session_id = last.session_id and l.done
         join day_items i on i.id = l.item_id and i.exercise_id = last.exercise_id
        order by last.exercise_id, l.set_no`,
      [user.id, exIds, s.id, s.date]) : Promise.resolve([] as Prev[]),
    warmupSettings(),
  ]);
  const items: RunnerItem[] = day.items.map((it) => {
    const p = it.kind === 'ejercicio' ? prevs.filter((x) => x.exercise_id === it.exercise_id) : [];
    const mine = logs.filter((l) => l.item_id === it.id);
    const n = it.kind === 'cardio' ? 1 : it.sets ?? 3;
    return {
      id: it.id, kind: it.kind, name: it.name, slug: it.slug, sets: n, reps: it.reps, note: it.note,
      rest: it.rest_s ?? 90, raise: it.raise_weight, feel: feels.find((f) => f.item_id === it.id)?.feel ?? null, segments: it.segments,
      target: it.weight_kg !== null ? Number(it.weight_kg) : null,
      prev: p.length ? { date: p[0].date, kg: p[0].kg, reps: p.map((x) => x.reps ?? '—').join('-') } : null,
      rows: Array.from({ length: n }).map((_, i) => {
        const l = mine.find((x) => x.set_no === i + 1);
        const lastKg = p[i]?.kg ?? p[0]?.kg ?? null;
        return {
          kg: l?.kg != null ? String(Number(l.kg)) : lastKg != null ? String(Number(lastKg)) : it.weight_kg != null ? String(Number(it.weight_kg)) : '',
          reps: l?.reps != null ? String(l.reps) : '',
          done: l?.done ?? false,
          minutes: l?.minutes ?? null,
        };
      }),
    };
  });
  const firstOpen = items.findIndex((i) => i.rows.some((r) => !r.done));
  const nothingDone = !logs.some((l) => l.done);
  const paso = searchParams.paso != null && searchParams.paso !== '' ? Number(searchParams.paso) : null;
  const start = paso != null && Number.isFinite(paso) ? paso : firstOpen === -1 ? items.length - 1 : firstOpen;
  const back = `/rutina?semana=${addDays(s.date, 1 - weekdayOf(s.date))}&dia=${day.weekday}`;
  const past = s.date < today();
  return (
    <SessionRunner back={back} key={logs.filter((l) => l.done).length} sessionId={s.id} date={s.date} past={past} finished={s.finished} items={items}
      // paso -1 = calentamiento, paso = cantidad de ejercicios = enfriamiento
      start={Math.max(-1, Math.min(items.length, start))} startAtWarmup={paso == null && nothingDone && !past}
      warm={past ? [] : warm.warm} cool={past ? [] : warm.cool}
      spotify={process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST || 'https://open.spotify.com/search/workout'} />
  );
}
