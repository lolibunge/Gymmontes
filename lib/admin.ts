import { redirect } from 'next/navigation';
import { requireUser } from './auth';
import { one, q } from './db';
import { slugify, type ParsedDay } from './routine-import';

export async function requireOwner() {
  const u = await requireUser();
  if (u.role !== 'duena') redirect('/');
  return u;
}

export async function pendingCount() {
  const r = await one<{ n: number }>(`select count(*)::int as n from routine_requests where status = 'Enviado'`);
  return r?.n ?? 0;
}

async function exerciseId(name: string): Promise<number> {
  const found = await one<{ id: number }>('select id from exercises where lower(name) = lower($1) limit 1', [name.trim()]);
  if (found) return found.id;
  let slug = slugify(name);
  for (let k = 2; await one('select 1 from exercises where slug = $1', [slug]); k++) slug = `${slugify(name)}-${k}`;
  const r = await one<{ id: number }>('insert into exercises (slug, name) values ($1,$2) returning id', [slug, name.trim()]);
  return r!.id;
}

/** Guarda una rutina nueva para el socio y archiva la anterior (el historial no se toca). */
export async function saveRoutine(userId: number, title: string, objective: string | null, days: ParsedDay[]) {
  await q('update routines set active = false where user_id = $1 and active', [userId]);
  const r = await one<{ id: number }>('insert into routines (user_id, title, objective) values ($1,$2,$3) returning id', [userId, title, objective]);
  for (const d of days) {
    const dr = await one<{ id: number }>(
      'insert into routine_days (routine_id, weekday, title, subtitle, note) values ($1,$2,$3,$4,$5) returning id',
      [r!.id, d.weekday, d.title, d.subtitle, d.note]
    );
    let pos = 1;
    for (const it of d.items) {
      await q(
        `insert into day_items (day_id, position, kind, exercise_id, sets, reps, weight_kg, note, segments, raise_weight)
         values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
        [dr!.id, pos++, it.kind, await exerciseId(it.name), it.sets, it.reps, it.weight, it.note, it.segments ? JSON.stringify(it.segments) : null, !!it.raise]
      );
    }
  }
  await q(`update routine_requests set status = 'Lista' where user_id = $1 and status = 'Enviado'`, [userId]);
  return r!.id;
}
