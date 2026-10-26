'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner, saveRoutine } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { parseCSV, parseRoutine, sheetsCsvUrl, type ParsedDay } from '@/lib/routine-import';

export async function markAttended(form: FormData) {
  await requireOwner();
  await q(`update routine_requests set status = 'Atendido' where id = $1`, [Number(form.get('id'))]);
  revalidatePath('/admin', 'layout');
}

export async function registerPayment(form: FormData) {
  await requireOwner();
  const userId = Number(form.get('user'));
  const paid = String(form.get('paid_on') || '');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paid)) return;
  await q(`insert into memberships (user_id, paid_on, expires_on) values ($1, $2::date, $2::date + 30)`, [userId, paid]);
  revalidatePath(`/admin/socios/${userId}`);
}

export type PreviewState = { error?: string; warnings?: string[]; days?: ParsedDay[]; source?: string };

export async function previewImport(_prev: PreviewState, form: FormData): Promise<PreviewState> {
  await requireOwner();
  const file = form.get('file');
  const link = String(form.get('link') || '').trim();
  let text = '';
  let source = '';
  if (file instanceof File && file.size > 0) {
    if (file.size > 500_000) return { error: 'El archivo es muy grande. Exportá solo la pestaña de la rutina.' };
    if (/\.xlsx?$/i.test(file.name)) return { error: 'Ese es un archivo de Excel. Guardalo como CSV (Archivo → Guardar como → CSV) o usá el link de Google Sheets.' };
    text = await file.text();
    source = file.name;
  } else if (link) {
    const url = sheetsCsvUrl(link);
    if (!url) return { error: 'Ese link no parece de Google Sheets. Copialo desde la barra del navegador con la planilla abierta.' };
    try {
      const r = await fetch(url, { redirect: 'follow', cache: 'no-store' });
      const type = r.headers.get('content-type') || '';
      if (!r.ok || type.includes('text/html')) {
        return { error: 'No pudimos abrir la planilla. En Google Sheets tocá Compartir → "Cualquier persona con el enlace" → Lector, y probá de nuevo.' };
      }
      text = await r.text();
      source = 'Google Sheets';
    } catch {
      return { error: 'No pudimos conectarnos con Google Sheets. Probá de nuevo o subí el archivo CSV.' };
    }
  } else {
    return { error: 'Subí un archivo CSV o pegá el link de Google Sheets.' };
  }
  const { days, warnings } = parseRoutine(parseCSV(text));
  if (!days.length) return { error: warnings[0] || 'No encontramos ejercicios en la planilla.', warnings: warnings.slice(1) };
  return { days, warnings, source };
}

export async function confirmImport(form: FormData) {
  await requireOwner();
  const userId = Number(form.get('user'));
  const days = JSON.parse(String(form.get('days') || '[]')) as ParsedDay[];
  const title = String(form.get('title') || '').trim() || `Rutina ${days.length} días`;
  const objective = String(form.get('objective') || '').trim() || null;
  if (!days.length) return;
  const u = await one('select id from users where id = $1', [userId]);
  if (!u) return;
  await saveRoutine(userId, title, objective, days);
  revalidatePath('/', 'layout');
  redirect(`/admin/socios/${userId}?rutina=ok`);
}

export async function saveEdits(form: FormData) {
  await requireOwner();
  const userId = Number(form.get('user'));
  const ids = form.getAll('item').map(Number);
  for (const id of ids) {
    const sets = form.get(`sets_${id}`);
    const kg = String(form.get(`kg_${id}`) ?? '').replace(',', '.').trim();
    await q(
      `update day_items i set sets = coalesce($2::int, i.sets), reps = $3, weight_kg = $4, raise_weight = $5, note = $6
         from routine_days d join routines r on r.id = d.routine_id
        where i.id = $1 and i.day_id = d.id and r.user_id = $7 and r.active`,
      [id, sets ? Number(sets) : null, String(form.get(`reps_${id}`) || '').trim() || null, kg === '' ? null : Number(kg) || null,
       form.get(`raise_${id}`) === 'on', String(form.get(`note_${id}`) || '').trim() || null, userId]
    );
  }
  revalidatePath('/', 'layout');
  redirect(`/admin/socios/${userId}?editada=1`);
}
