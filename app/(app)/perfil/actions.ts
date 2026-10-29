'use server';
import { formatBirth, parseBirth } from '@/lib/birthdays';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { checkPin, hashPassword, requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { q } from '@/lib/db';
import { emailOwner, esc } from '@/lib/notify';

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
  const rawBirth = clean(form.get('birth'));
  const b = parseBirth(rawBirth);
  if (rawBirth && !b) redirect('/perfil/datos?error=nacimiento');
  await q(
    `update users set name = coalesce($1, name), phone = $2, birth = $3, weight_kg = $4, height_cm = $5, emergency = $6, show_birthday = $7 where id = $8`,
    [clean(form.get('name')), clean(form.get('phone')), b ? formatBirth(b) : null, num(form.get('weight')), num(form.get('height')), clean(form.get('emergency')), form.get('show_birthday') === 'on', user.id]
  );
  revalidatePath('/', 'layout');
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
  const notes = clean(form.get('notes'));
  const base = process.env.APP_URL || 'https://gymmontes.vercel.app';
  if (form.get('kind') === 'ajuste') {
    const change = clean(form.get('change')) ?? 'Ajuste';
    const weekday = Number(form.get('day')) || null;
    const exercise = clean(form.get('exercise'));
    if (!notes && !exercise) redirect('/pedir?tipo=ajuste&falta=1');
    await q('insert into routine_requests (user_id, kind, change, weekday, exercise, notes) values ($1,$2,$3,$4,$5,$6)',
      [user.id, 'ajuste', change, weekday, exercise, notes]);
    const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
    await emailOwner(
      `Ajuste de rutina: ${user.name}`,
      `<h2 style="font-family:Arial">${esc(user.name)} pide un ajuste</h2>
       <p style="font-family:Arial"><b>${esc(change)}</b>${weekday ? ` · ${DIAS[weekday]}` : ''}${exercise ? ` · ${esc(exercise)}` : ''}<br>${esc(notes ?? '')}</p>
       <p style="font-family:Arial"><a href="${base}/admin/pedidos">Abrir la bandeja de pedidos</a></p>`
    );
    redirect('/pedir?enviado=1');
  }
  await q('insert into routine_requests (user_id, goals, days, notes) values ($1,$2,$3,$4)', [user.id, goals, days, notes]);
  await emailOwner(
    `Nuevo pedido de rutina: ${user.name}`,
    `<h2 style="font-family:Arial">Pedido de rutina de ${esc(user.name)}</h2>
     <p style="font-family:Arial"><b>Busca:</b> ${esc(goals.join(', ') || '—')}<br><b>Días por semana:</b> ${days ?? '—'}<br><b>Lesiones o molestias:</b> ${esc(notes ?? '—')}<br><b>Email:</b> ${esc(user.email)}</p>
     <p style="font-family:Arial"><a href="${base}/admin/pedidos">Abrir la bandeja de pedidos</a></p>`
  );
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

/** El socio indica cuándo pagó su último mes (solo si todavía no hay un pago registrado). */
export async function declarePayment(form: FormData) {
  const user = await requireUser();
  const paid = String(form.get('paid_on') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paid)) return;
  const has = await q('select 1 from memberships where user_id = $1 limit 1', [user.id]);
  if (has.length) return;
  await q(`insert into memberships (user_id, paid_on, expires_on) values ($1, $2::date, $2::date + 30)`, [user.id, paid]);
  revalidatePath('/perfil');
  revalidatePath('/');
}

export type PwState = { ok?: boolean; error?: string };
export async function changePassword(_prev: PwState, form: FormData): Promise<PwState> {
  const u = await requireUser();
  const cur = String(form.get('current') || '');
  const pw = String(form.get('password') || '');
  if (pw.length < 8) return { error: 'La contraseña nueva tiene que tener al menos 8 caracteres.' };
  const row = await one<{ pin_hash: string }>('select pin_hash from users where id = $1', [u.id]);
  if (row?.pin_hash && !checkPin(cur, row.pin_hash)) return { error: 'La contraseña actual no coincide.' };
  await q(`update users set pin_hash = $2, auth_provider = 'password' where id = $1`, [u.id, hashPassword(pw)]);
  return { ok: true };
}
