import { birthdaysToday } from './birthdays';
import { q, one } from './db';
import { addDays, daysBetween, today, weekdayOf } from './dates';

export type Segment = { label: string; min: number };
export type Item = {
  id: number; position: number; kind: 'ejercicio' | 'cardio';
  exercise_id: number; slug: string; name: string; muscle: string | null;
  sets: number | null; reps: string | null; weight_kg: string | null; rest_s: number | null;
  raise_weight: boolean; note: string | null; segments: Segment[] | null;
};
export type Day = { id: number; weekday: number; title: string; subtitle: string | null; note: string | null; items: Item[] };

export async function routineDays(userId: number): Promise<Day[]> {
  const days = await q<Omit<Day, 'items'>>(
    `select d.id, d.weekday, d.title, d.subtitle, d.note
       from routine_days d join routines r on r.id = d.routine_id
      where r.user_id = $1 and r.active order by d.weekday`,
    [userId]
  );
  if (!days.length) return [];
  const items = await q<Item & { day_id: number }>(
    `select i.id, i.day_id, i.position, i.kind, i.exercise_id, e.slug, e.name, e.muscle, i.sets, i.reps,
            i.weight_kg::text as weight_kg, i.rest_s, i.raise_weight, i.note, i.segments
       from day_items i join exercises e on e.id = i.exercise_id
      where i.day_id = any($1) and not i.removed order by i.position`,
    [days.map((d) => d.id)]
  );
  return days.map((d) => ({ ...d, items: items.filter((i) => i.day_id === d.id) }));
}

export async function dayById(userId: number, dayId: number): Promise<Day | null> {
  const all = await routineDays(userId);
  return all.find((d) => d.id === dayId) ?? null;
}

/** El día que toca hoy; si hoy es descanso, el próximo. */
export async function todaysPlan(userId: number) {
  const days = await routineDays(userId);
  const t = today();
  const wd = weekdayOf(t);
  const hoy = days.find((d) => d.weekday === wd) ?? null;
  const proximo = hoy ?? days.find((d) => d.weekday > wd) ?? days[0] ?? null;
  return { days, hoy, proximo, wd, t };
}

export function minutes(segments: Segment[] | null) {
  return (segments ?? []).reduce((a, s) => a + s.min, 0);
}

export function weightLabel(kg: string | null) {
  if (kg === null || kg === undefined) return '—';
  return `${Number(kg).toString().replace('.', ',')} kg`;
}

export async function weekDone(userId: number) {
  const t = today();
  const monday = addDays(t, 1 - weekdayOf(t));
  const rows = await q<{ date: string }>(
    `select distinct to_char(date,'YYYY-MM-DD') as date from sessions
      where user_id = $1 and date between $2 and $3 and finished_at is not null`,
    [userId, monday, addDays(monday, 6)]
  );
  return new Set(rows.map((r) => weekdayOf(r.date)));
}

/** Lo que hizo la última vez en ese ejercicio: kg y reps por serie. */
export async function lastTime(userId: number, exerciseId: number, excludeSession?: number, upTo?: string) {
  const s = await one<{ session_id: number; date: string }>(
    `select s.id as session_id, to_char(s.date,'YYYY-MM-DD') as date
       from set_logs l join sessions s on s.id = l.session_id join day_items i on i.id = l.item_id
      where s.user_id = $1 and i.exercise_id = $2 and l.done and s.id <> coalesce($3, -1)
        and ($4::date is null or s.date <= $4::date)
      order by s.date desc, s.id desc limit 1`,
    [userId, exerciseId, excludeSession ?? null, upTo ?? null]
  );
  if (!s) return null;
  const sets = await q<{ kg: string | null; reps: number | null }>(
    `select l.kg::text as kg, l.reps from set_logs l join day_items i on i.id = l.item_id
      where l.session_id = $1 and i.exercise_id = $2 and l.done order by l.set_no`,
    [s.session_id, exerciseId]
  );
  return { date: s.date, sets };
}

export async function membership(userId: number) {
  const m = await one<{ paid_on: string; expires_on: string }>(
    `select to_char(paid_on,'YYYY-MM-DD') as paid_on, to_char(expires_on,'YYYY-MM-DD') as expires_on
       from memberships where user_id = $1 order by expires_on desc limit 1`,
    [userId]
  );
  if (!m) return null;
  const t = today();
  const left = daysBetween(t, m.expires_on);
  const total = Math.max(1, daysBetween(m.paid_on, m.expires_on));
  const used = Math.min(total, Math.max(0, daysBetween(m.paid_on, t)));
  const estado = left < 0 ? 'vencida' : left <= 7 ? 'por vencer' : 'al día';
  return { ...m, left, pct: Math.round((used / total) * 100), estado } as const;
}

export async function monthCount(userId: number) {
  const r = await one<{ n: number }>(
    // Días distintos con una sesión terminada y al menos una serie hecha (repetir el mismo día no suma dos)
    `select count(distinct s.date)::int as n from sessions s where s.user_id = $1 and s.finished_at is not null
       and to_char(s.date,'YYYY-MM') = $2 and exists (select 1 from set_logs l where l.session_id = s.id and l.done)`,
    [userId, today().slice(0, 7)]
  );
  return r?.n ?? 0;
}

export async function challenge() {
  return one<{ id: number; title: string; description: string; target: number }>(
    'select id, title, description, target from challenges where month = $1 limit 1',
    [today().slice(0, 7)]
  );
}

export async function raffle(userId: number) {
  return one<{ id: number; title: string; closes_on: string; n: number; joined: boolean }>(
    `select r.id, r.title, to_char(r.closes_on,'YYYY-MM-DD') as closes_on,
            (select count(*)::int from raffle_entries e where e.raffle_id = r.id) as n,
            exists(select 1 from raffle_entries e where e.raffle_id = r.id and e.user_id = $1) as joined
       from raffles r where r.closes_on >= $2 order by r.closes_on limit 1`,
    [userId, today()]
  );
}

/** Novedades del gym. Arriba de todo, los cumpleaños de hoy (se arman solos con la fecha de nacimiento). */
export async function news(limit = 5) {
  const [rows, cumple] = await Promise.all([
    q<{ id: number; date: string; title: string; body: string | null }>(
      `select id, to_char(date,'YYYY-MM-DD') as date, title, body from news order by date desc limit $1`,
      [limit]
    ),
    birthdaysToday(),
  ]);
  const t = today();
  const bdays = cumple.map((c) => ({ id: -c.id, date: t, title: `🎂 ¡Feliz cumpleaños, ${c.name}!`, body: 'Hoy es su cumple. ¡Dale un saludo en el gym!' as string | null, birthday: true }));
  return [...bdays, ...rows.map((r) => ({ ...r, birthday: false }))];
}

export async function stats(userId: number) {
  const total = await one<{ n: number }>('select count(*)::int as n from sessions where user_id = $1 and finished_at is not null', [userId]);
  const weeks = await q<{ w: string }>(
    `select distinct to_char(date_trunc('week', date),'YYYY-MM-DD') as w from sessions
      where user_id = $1 and finished_at is not null order by w desc`,
    [userId]
  );
  let streak = 0;
  let expect = addDays(today(), 1 - weekdayOf(today()));
  const set = new Set(weeks.map((x) => x.w));
  if (!set.has(expect)) expect = addDays(expect, -7);
  while (set.has(expect)) { streak++; expect = addDays(expect, -7); }
  const up = await one<{ n: number }>(
    `select count(*)::int as n from day_items i join routine_days d on d.id = i.day_id join routines r on r.id = d.routine_id
      where r.user_id = $1 and r.active and i.raise_weight and not i.removed`,
    [userId]
  );
  return { total: total?.n ?? 0, streak, toRaise: up?.n ?? 0 };
}

export type Raise = { dir: 'up' | 'down'; reason: 'planilla' | 'reps' | 'liviano' | 'pesado'; kg: number | null; next: number | null };

/** Rango "8–12" → [8, 12]. Null si es por tiempo o no tiene números. */
export function repRange(reps: string | null): [number, number] | null {
  if (!reps || /\d\s*(s|seg|segundos?|″|")\s*$/i.test(reps.trim())) return null;
  const n = (reps.match(/\d+/g) ?? []).map(Number);
  return n.length ? [n[0], n[n.length - 1]] : null;
}

/** Cuánto subir: 1 kg en cargas chicas (mancuernas livianas), 2,5 kg en el resto. */
export const nextKg = (kg: number) => kg + (kg < 10 ? 1 : 2.5);

/**
 * Para cada ejercicio, si toca subir el peso y por qué:
 * - la planilla lo marca (▲ / ¿Rango alto? = Sí),
 * - la última vez llegó al tope de reps en todas las series,
 * - o la última vez marcó que le resultó liviano (o pesado: sugiere bajar).
 */
export async function raiseSignals(userId: number, items: Item[], upTo?: string, excludeSession?: number): Promise<Map<number, Raise>> {
  const out = new Map<number, Raise>();
  const ex = items.filter((i) => i.kind === 'ejercicio');
  if (!ex.length) return out;
  const last = await q<{ exercise_id: number; session_id: number }>(
    `select distinct on (i.exercise_id) i.exercise_id, s.id as session_id
       from set_logs l join sessions s on s.id = l.session_id join day_items i on i.id = l.item_id
      where s.user_id = $1 and l.done and i.exercise_id = any($2) and s.id <> coalesce($3, -1)
        and ($4::date is null or s.date <= $4::date)
      order by i.exercise_id, s.date desc, s.id desc`,
    [userId, ex.map((i) => i.exercise_id), excludeSession ?? null, upTo ?? null]
  );
  const sets = last.length ? await q<{ exercise_id: number; kg: string | null; reps: number | null }>(
    `select i.exercise_id, l.kg::text as kg, l.reps from set_logs l join day_items i on i.id = l.item_id
      where l.done and (l.session_id, i.exercise_id) in (select * from unnest($1::int[], $2::int[]))`,
    [last.map((l) => l.session_id), last.map((l) => l.exercise_id)]
  ) : [];
  const feels = last.length ? await q<{ exercise_id: number; feel: string }>(
    `select i.exercise_id, f.feel from set_feel f join day_items i on i.id = f.item_id
      where (f.session_id, i.exercise_id) in (select * from unnest($1::int[], $2::int[]))`,
    [last.map((l) => l.session_id), last.map((l) => l.exercise_id)]
  ) : [];
  for (const it of ex) {
    const mine = sets.filter((x) => x.exercise_id === it.exercise_id);
    const kgs = mine.map((x) => Number(x.kg)).filter((x) => x > 0);
    const kg = kgs.length ? Math.max(...kgs) : it.weight_kg != null ? Number(it.weight_kg) : null;
    const range = repRange(it.reps);
    const top = !!range && mine.length >= (it.sets ?? 1) && mine.every((x) => (x.reps ?? 0) >= range[1]);
    // Lo que marcó la socia manda: Liviano → subir, Pesado → bajar, Justo → nada.
    // Si no marcó nada, se sugiere subir cuando llegó al tope de reps o lo pide la planilla.
    const feel = feels.find((f) => f.exercise_id === it.exercise_id)?.feel;
    const next = kg != null && kg > 0 ? nextKg(kg) : null;
    if (feel === 'liviano') out.set(it.id, { dir: 'up', reason: 'liviano', kg, next });
    else if (feel === 'pesado') out.set(it.id, { dir: 'down', reason: 'pesado', kg, next: null });
    else if (feel === 'justo') continue;
    else if (top) out.set(it.id, { dir: 'up', reason: 'reps', kg, next });
    else if (it.raise_weight) out.set(it.id, { dir: 'up', reason: 'planilla', kg, next });
  }
  return out;
}
