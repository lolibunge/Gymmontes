'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';

export async function setTheme(form: FormData) {
  const user = await requireUser();
  const t = String(form.get('theme'));
  if (!['claro', 'oscuro', 'auto'].includes(t)) return;
  await q('update users set theme = $1 where id = $2', [t, user.id]);
  revalidatePath('/', 'layout');
}

const clean = (v: FormDataEntryValue | null) => {
  const s = String(v ?? '').trim();
  return s === '' ? null : s;
};

export async function saveDatos(form: FormData) {
  const user = await requireUser();
  const num = (v: FormDataEntryValue | null) => { const s = clean(v); return s ? Number(s.replace(',', '.')) || null : null; };
  await q(
    `update users set name = coalesce($1, name), phone = $2, birth = $3, weight_kg = $4, height_cm = $5, emergency = $6 where id = $7`,
    [clean(form.get('name')), clean(form.get('phone')), clean(form.get('birth')), num(form.get('weight')), num(form.get('height')), clean(form.get('emergency')), user.id]
  );
  revalidatePath('/perfil');
  redirect('/perfil/datos?ok=1');
}

export async function addInjury(form: FormData) {
  const user = await requireUser();
  const title = clean(form.get('title'));
  if (!title) return;
  await q('insert into injuries (user_id, title, status, notes) values ($1,$2,$3,$4)', [user.id, title, 'En seguimiento', clean(form.get('notes'))]);
  revalidatePath('/perfil/objetivos');
}

export async function saveGoals(form: FormData) {
  const user = await requireUser();
  await q('update users set goals_text = $1 where id = $2', [clean(form.get('goals')), user.id]);
  revalidatePath('/perfil/objetivos');
}

export async function sendRequest(form: FormData) {
  const user = await requireUser();
  const goals = form.getAll('goal').map(String);
  const days = Number(form.get('days')) || null;
  await q('insert into routine_requests (user_id, goals, days, notes) values ($1,$2,$3,$4)', [user.id, goals, days, clean(form.get('notes'))]);
  redirect('/pedir?enviado=1');
}

export async function joinRaffle(form: FormData) {
  const user = await requireUser();
  const id = Number(form.get('id'));
  const leave = form.get('leave') === '1';
  if (leave) await q('delete from raffle_entries where raffle_id = $1 and user_id = $2', [id, user.id]);
  else await q('insert into raffle_entries (raffle_id, user_id) values ($1,$2) on conflict do nothing', [id, user.id]);
  revalidatePath('/comunidad');
}
