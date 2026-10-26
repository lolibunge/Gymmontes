'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireOwner, saveRoutine } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { parseCSV, parseRoutine, sheetsCsvUrls, type ParsedDay } from '@/lib/routine-import';

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
    const urls = sheetsCsvUrls(link);
    if (!urls) return { error: 'Ese link no parece de Google Sheets. Copialo desde la barra del navegador con la planilla abierta.' };
    const got = await fetchSheet(urls);
    if ('error' in got) return { error: got.error };
    text = got.text;
    source = 'Google Sheets';
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

// ---------- Tu gym: novedades, reto y sorteo ----------
const txt = (v: FormDataEntryValue | null) => String(v ?? '').trim();

export async function addNews(form: FormData) {
  await requireOwner();
  const title = txt(form.get('title'));
  if (!title) return;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(txt(form.get('date'))) ? txt(form.get('date')) : null;
  await q('insert into news (date, title, body) values (coalesce($1::date, current_date), $2, $3)', [date, title, txt(form.get('body')) || null]);
  revalidatePath('/', 'layout');
}

export async function deleteNews(form: FormData) {
  await requireOwner();
  await q('delete from news where id = $1', [Number(form.get('id'))]);
  revalidatePath('/', 'layout');
}

export async function saveChallenge(form: FormData) {
  await requireOwner();
  const month = txt(form.get('month'));
  const title = txt(form.get('title'));
  const target = Number(form.get('target'));
  if (!/^\d{4}-\d{2}$/.test(month) || !title || !target) return;
  const ex = await one<{ id: number }>('select id from challenges where month = $1', [month]);
  if (ex) await q('update challenges set title = $2, target = $3, description = $4 where id = $1', [ex.id, title, target, txt(form.get('description')) || null]);
  else await q('insert into challenges (title, description, target, month) values ($1,$2,$3,$4)', [title, txt(form.get('description')) || null, target, month]);
  revalidatePath('/', 'layout');
}

export async function createRaffle(form: FormData) {
  await requireOwner();
  const title = txt(form.get('title'));
  const closes = txt(form.get('closes_on'));
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(closes)) return;
  await q('insert into raffles (title, closes_on) values ($1, $2)', [title, closes]);
  revalidatePath('/', 'layout');
}

export async function drawWinner(form: FormData) {
  await requireOwner();
  const id = Number(form.get('id'));
  const w = await one<{ user_id: number }>('select user_id from raffle_entries where raffle_id = $1 order by random() limit 1', [id]);
  if (!w) return;
  await q('update raffles set winner_id = $2, closes_on = least(closes_on, current_date) where id = $1', [id, w.user_id]);
  revalidatePath('/', 'layout');
}

const DOWNLOAD_TIP = 'Mientras tanto, en Google Sheets: Archivo → Descargar → Valores separados por comas (.csv), con la pestaña Rutina abierta, y subí ese archivo acá abajo.';

/** Prueba las dos formas de bajar la pestaña como CSV y devuelve la primera que trae datos. */
async function fetchSheet(urls: string[]): Promise<{ text: string } | { error: string }> {
  let status = 0;
  let sawLogin = false;
  for (const url of urls) {
    try {
      const r = await fetch(url, {
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'User-Agent': 'Mozilla/5.0 (GYM MONTES)', Accept: 'text/csv,text/plain,*/*' },
      });
      status = r.status;
      const body = await r.text();
      const html = /^\s*<(!doctype|html)/i.test(body);
      console.log('[sheets]', url.replace(/\/d\/[^/]+/, '/d/…'), r.status, r.headers.get('content-type'), html ? 'html' : `${body.length} chars`);
      if (r.ok && !html && body.trim()) return { text: body };
      if (html && /accounts\.google\.com|ServiceLogin|signin/i.test(body)) sawLogin = true;
    } catch (e) {
      console.error('[sheets]', e);
    }
  }
  if (sawLogin || status === 401 || status === 403) {
    return { error: `Google no nos deja leer la planilla (pide iniciar sesión). Revisá Compartir → Acceso general → "Cualquier persona con el enlace" → Lector. Si usás una cuenta de empresa, puede que esa opción esté bloqueada. ${DOWNLOAD_TIP}` };
  }
  if (status === 404) return { error: `No encontramos esa pestaña. Abrí la pestaña Rutina y copiá el link de nuevo. ${DOWNLOAD_TIP}` };
  return { error: `No pudimos abrir la planilla${status ? ` (Google respondió ${status})` : ''}. ${DOWNLOAD_TIP}` };
}
