'use server';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { today } from '@/lib/dates';

const KEYS = ['weight', 'fat_pct', 'waist', 'hip', 'chest', 'arm_l', 'arm_r', 'thigh_l', 'thigh_r', 'calf_l', 'calf_r'] as const;
// Rangos razonables para no guardar un error de tipeo (ej. 700 en vez de 70)
const RANGE: Record<(typeof KEYS)[number], [number, number]> = {
  weight: [25, 300], fat_pct: [3, 70], waist: [40, 200], hip: [50, 220], chest: [50, 200],
  arm_l: [15, 70], arm_r: [15, 70], thigh_l: [25, 110], thigh_r: [25, 110], calf_l: [20, 70], calf_r: [20, 70],
};

export async function saveMeasure(form: FormData) {
  const u = await requireUser();
  const date = String(form.get('date') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || date > today()) redirect('/perfil/medidas?error=fecha');
  const vals: (number | null)[] = [];
  for (const k of KEYS) {
    const raw = String(form.get(k) ?? '').trim().replace(',', '.');
    if (!raw) { vals.push(null); continue; }
    const n = Number(raw);
    if (!Number.isFinite(n) || n < RANGE[k][0] || n > RANGE[k][1]) redirect(`/perfil/medidas?error=${k}&fecha=${date}`);
    vals.push(Math.round(n * 10) / 10);
  }
  if (vals.every((v) => v == null)) redirect(`/perfil/medidas?error=vacio&fecha=${date}`);
  const note = String(form.get('note') ?? '').trim().slice(0, 300) || null;
  await q(
    `insert into body_measurements (user_id, date, ${KEYS.join(', ')}, note) values ($1, $2, ${KEYS.map((_, i) => `$${i + 3}`).join(', ')}, $${KEYS.length + 3})
     on conflict (user_id, date) do update set ${KEYS.map((k) => `${k} = excluded.${k}`).join(', ')}, note = excluded.note`,
    [u.id, date, ...vals, note]
  );
  // El peso más reciente también queda en Datos personales
  await q(
    `update users set weight_kg = (select weight from body_measurements where user_id = $1 and weight is not null order by date desc limit 1) where id = $1
       and exists (select 1 from body_measurements where user_id = $1 and weight is not null)`,
    [u.id]
  );
  revalidatePath('/perfil/medidas');
  revalidatePath('/');
  redirect('/perfil/medidas?ok=1');
}

export async function deleteMeasure(form: FormData) {
  const u = await requireUser();
  await q('delete from body_measurements where id = $1 and user_id = $2', [Number(form.get('id')), u.id]);
  revalidatePath('/perfil/medidas');
  redirect('/perfil/medidas');
}
