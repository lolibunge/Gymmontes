'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { today, weekdayOf } from '@/lib/dates';
import { dayById, routineDays } from '@/lib/data';

export async function startSession(form: FormData) {
  const user = await requireUser();
  const dayId = Number(form.get('dia'));
  const day = await one<{ id: number }>(
    `select d.id from routine_days d join routines r on r.id = d.routine_id where d.id = $1 and r.user_id = $2`,
    [dayId, user.id]
  );
  if (!day) redirect('/rutina');
  // Si ya hay una sesión abierta de hoy para ese día, seguimos en esa
  const open = await one<{ id: number }>(
    'select id from sessions where user_id = $1 and day_id = $2 and date = $3 and finished_at is null order by id desc limit 1',
    [user.id, dayId, today()]
  );
  const id = open?.id ?? (await one<{ id: number }>('insert into sessions (user_id, day_id, date) values ($1,$2,$3) returning id', [user.id, dayId, today()]))!.id;
  redirect(`/sesion/${id}`);
}

async function ownSession(userId: number, sessionId: number) {
  return one<{ id: number }>('select id from sessions where id = $1 and user_id = $2', [sessionId, userId]);
}

export async function saveSet(sessionId: number, itemId: number, setNo: number, kg: number | null, reps: number | null, done: boolean) {
  const user = await requireUser();
  if (!(await ownSession(user.id, sessionId))) throw new Error('Sesión no encontrada');
  await q(
    `insert into set_logs (session_id, item_id, set_no, kg, reps, done) values ($1,$2,$3,$4,$5,$6)
     on conflict (session_id, item_id, set_no) do update set kg = excluded.kg, reps = excluded.reps, done = excluded.done`,
    [sessionId, itemId, setNo, kg, reps, done]
  );
}

export async function saveCardio(sessionId: number, itemId: number, minutes: number) {
  const user = await requireUser();
  if (!(await ownSession(user.id, sessionId))) throw new Error('Sesión no encontrada');
  await q(
    `insert into set_logs (session_id, item_id, set_no, minutes, done) values ($1,$2,1,$3,true)
     on conflict (session_id, item_id, set_no) do update set minutes = excluded.minutes, done = true`,
    [sessionId, itemId, minutes]
  );
}

export async function finishSession(form: FormData) {
  const user = await requireUser();
  const id = Number(form.get('id'));
  await q('update sessions set finished_at = coalesce(finished_at, now()) where id = $1 and user_id = $2', [id, user.id]);
  revalidatePath('/');
  // Sesiones pasadas o corregidas: volver a la semana donde estaba
  const volver = String(form.get('volver') || '');
  if (volver.startsWith('/rutina?')) redirect(volver);
  redirect(`/perfil/historial?ok=${id}`);
}

/** Cargar una sesión que se hizo antes de tener la app (o que se olvidó registrar). */
export async function startPastSession(form: FormData) {
  const user = await requireUser();
  const date = String(form.get('fecha') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) redirect('/perfil/historial?error=fecha');
  const days = await routineDays(user.id);
  const chosen = Number(form.get('dia')) || 0;
  const day = chosen ? days.find((d) => d.id === chosen) : days.find((d) => d.weekday === weekdayOf(date));
  if (!day) redirect(`/perfil/historial?error=dia&fecha=${date}`);
  const open = await one<{ id: number }>(
    'select id from sessions where user_id = $1 and day_id = $2 and date = $3 order by id desc limit 1',
    [user.id, day.id, date]
  );
  const id = open?.id ?? (await one<{ id: number }>('insert into sessions (user_id, day_id, date) values ($1,$2,$3) returning id', [user.id, day.id, date]))!.id;
  redirect(`/sesion/${id}?paso=0`);
}

/** Marca todas las series pendientes con el peso y las reps de la rutina (para cargar rápido sesiones pasadas). */
export async function fillPlanned(form: FormData) {
  const user = await requireUser();
  const id = Number(form.get('id'));
  const s = await one<{ id: number; day_id: number }>('select id, day_id from sessions where id = $1 and user_id = $2', [id, user.id]);
  if (!s) redirect('/perfil/historial');
  const day = await dayById(user.id, s.day_id);
  if (!day) redirect('/perfil/historial');
  for (const it of day.items) {
    if (it.kind === 'cardio') {
      const min = (it.segments ?? []).reduce((a, x) => a + x.min, 0) || null;
      await q(
        `insert into set_logs (session_id, item_id, set_no, minutes, done) values ($1,$2,1,$3,true)
         on conflict (session_id, item_id, set_no) do nothing`,
        [s.id, it.id, min]
      );
      continue;
    }
    // "8–10" → 8; "10 / pierna" → 10; "40–60 s" → 40
    const reps = Number(it.reps?.match(/\d+/)?.[0]) || null;
    for (let n = 1; n <= (it.sets ?? 3); n++) {
      await q(
        `insert into set_logs (session_id, item_id, set_no, kg, reps, done) values ($1,$2,$3,$4,$5,true)
         on conflict (session_id, item_id, set_no) do nothing`,
        [s.id, it.id, n, it.weight_kg, reps]
      );
    }
  }
  redirect(`/sesion/${s.id}?paso=0`);
}
