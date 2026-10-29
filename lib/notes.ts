'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { redirect } from 'next/navigation';

/** Nota de prueba (feedback) del socio. Devuelve ok para que la hoja se cierre sin navegar. */
export async function saveNote(form: FormData): Promise<{ ok: boolean; error?: string }> {
  const user = await requireUser();
  const body = String(form.get('body') ?? '').trim().slice(0, 2000);
  const context = String(form.get('context') ?? '').trim().slice(0, 200) || null;
  if (!body) return { ok: false, error: 'Escribí algo antes de guardar.' };
  await q('insert into notes (user_id, body, context) values ($1,$2,$3)', [user.id, body, context]);
  revalidatePath('/perfil/notas');
  revalidatePath('/admin/notas');
  return { ok: true };
}

export async function markNote(form: FormData) {
  await requireOwner();
  const id = Number(form.get('id'));
  const status = String(form.get('status'));
  if (!['nueva', 'vista', 'resuelta'].includes(status)) return;
  await q('update notes set status = $1 where id = $2', [status, id]);
  revalidatePath('/admin/notas');
  revalidatePath('/admin');
}

/** ¿Se muestra el cartel de "versión de prueba"? Prendido salvo que la dueña lo apague. */
export async function betaOn(): Promise<boolean> {
  const r = await one<{ value: string | null }>(`select value from gym_settings where key = 'beta_banner'`);
  return r?.value !== 'no';
}

export async function setBeta(form: FormData) {
  await requireOwner();
  const on = form.get('on') === 'si';
  await q(`insert into gym_settings (key, value) values ('beta_banner', $1) on conflict (key) do update set value = excluded.value`, [on ? 'si' : 'no']);
  revalidatePath('/', 'layout');
  redirect('/admin/notas');
}
