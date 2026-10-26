import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { dayById, lastTime } from '@/lib/data';
import { today } from '@/lib/dates';
import SessionRunner, { type RunnerItem } from './SessionRunner';

export default async function Sesion({ params, searchParams }: { params: { id: string }; searchParams: { paso?: string } }) {
  const user = await requireUser();
  const s = await one<{ id: number; day_id: number; date: string; finished: boolean }>(
    `select id, day_id, to_char(date,'YYYY-MM-DD') as date, finished_at is not null as finished from sessions where id = $1 and user_id = $2`,
    [Number(params.id), user.id]
  );
  if (!s) notFound();
  const day = await dayById(user.id, s.day_id);
  if (!day) notFound();
  const logs = await q<{ item_id: number; set_no: number; kg: string | null; reps: number | null; minutes: number | null; done: boolean }>(
    'select item_id, set_no, kg::text as kg, reps, minutes, done from set_logs where session_id = $1',
    [s.id]
  );
  const items: RunnerItem[] = await Promise.all(
    day.items.map(async (it) => {
      const prev = it.kind === 'ejercicio' ? await lastTime(user.id, it.exercise_id, s.id, s.date) : null;
      const mine = logs.filter((l) => l.item_id === it.id);
      const n = it.kind === 'cardio' ? 1 : it.sets ?? 3;
      return {
        id: it.id, kind: it.kind, name: it.name, slug: it.slug, sets: n, reps: it.reps, note: it.note,
        rest: it.rest_s ?? 90, raise: it.raise_weight, segments: it.segments,
        target: it.weight_kg !== null ? Number(it.weight_kg) : null,
        prev: prev && prev.sets.length ? { date: prev.date, kg: prev.sets[0].kg, reps: prev.sets.map((x) => x.reps ?? '—').join('-') } : null,
        rows: Array.from({ length: n }).map((_, i) => {
          const l = mine.find((x) => x.set_no === i + 1);
          const lastKg = prev?.sets[i]?.kg ?? prev?.sets[0]?.kg ?? null;
          return {
            kg: l?.kg != null ? String(Number(l.kg)) : lastKg != null ? String(Number(lastKg)) : it.weight_kg != null ? String(Number(it.weight_kg)) : '',
            reps: l?.reps != null ? String(l.reps) : '',
            done: l?.done ?? false,
            minutes: l?.minutes ?? null,
          };
        }),
      };
    })
  );
  const firstOpen = items.findIndex((i) => i.rows.some((r) => !r.done));
  const start = searchParams.paso ? Number(searchParams.paso) : firstOpen === -1 ? items.length - 1 : firstOpen;
  return <SessionRunner key={logs.filter((l) => l.done).length} sessionId={s.id} date={s.date} past={s.date < today()} items={items} start={Math.max(0, Math.min(items.length - 1, start))} spotify={process.env.NEXT_PUBLIC_SPOTIFY_PLAYLIST || 'https://open.spotify.com/search/workout'} />;
}
