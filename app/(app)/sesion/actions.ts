'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { today } from '@/lib/dates';

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
  redirect(`/perfil/historial?ok=${id}`);
}
