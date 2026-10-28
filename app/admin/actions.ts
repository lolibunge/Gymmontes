'use server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { exerciseId, requireOwner, saveRoutine } from '@/lib/admin';
import crypto from 'node:crypto';
import { one, q } from '@/lib/db';
import { hashPassword } from '@/lib/auth';
import { addMonth, setSetting } from '@/lib/payments';
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
  await addMonth(userId, paid);
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
  // Solo ítems de la rutina activa de ese socio
  const own = async (id: number) => one<{ day_id: number; position: number; exercise_id: number; name: string; kind: string }>(
    `select i.day_id, i.position, i.exercise_id, e.name, i.kind from day_items i join exercises e on e.id = i.exercise_id
       join routine_days d on d.id = i.day_id join routines r on r.id = d.routine_id
      where i.id = $1 and r.user_id = $2 and r.active and not i.removed`, [id, userId]);
  for (const raw of ids) {
    let id = raw;
    const cur = await own(id);
    if (!cur) continue;
    // Quitar: se oculta de la rutina pero el historial queda
    if (form.get(`remove_${id}`) === 'on') { await q('update day_items set removed = true where id = $1', [id]); continue; }
    // Cambiar el ejercicio: el viejo se oculta y entra uno nuevo en el mismo lugar (así el historial sigue con el nombre viejo)
    const newName = String(form.get(`name_${id}`) || '').trim();
    if (newName && newName.toLowerCase() !== cur.name.toLowerCase()) {
      await q('update day_items set removed = true where id = $1', [id]);
      const r = await one<{ id: number }>(
        `insert into day_items (day_id, position, kind, exercise_id, sets, reps, weight_kg, rest_s, raise_weight, note, segments)
         select day_id, position, kind, $2, sets, reps, weight_kg, rest_s, false, note, segments from day_items where id = $1 returning id`,
        [id, await exerciseId(newName)]);
      id = r!.id;
    }
    const sets = form.get(`sets_${raw}`);
    const kg = String(form.get(`kg_${raw}`) ?? '').replace(',', '.').trim();
    await q(
      `update day_items i set sets = coalesce($2::int, i.sets), reps = $3, weight_kg = $4, raise_weight = $5, note = $6
         from routine_days d join routines r on r.id = d.routine_id
        where i.id = $1 and i.day_id = d.id and r.user_id = $7 and r.active`,
      [id, sets ? Number(sets) : null, String(form.get(`reps_${raw}`) || '').trim() || null, kg === '' ? null : Number(kg) || null,
       form.get(`raise_${raw}`) === 'on', String(form.get(`note_${raw}`) || '').trim() || null, userId]
    );
  }
  // Agregar un ejercicio al final de un día
  for (const dayId of form.getAll('day').map(Number)) {
    const name = String(form.get(`new_name_${dayId}`) || '').trim();
    if (!name) continue;
    const d = await one<{ id: number }>(
      `select d.id from routine_days d join routines r on r.id = d.routine_id where d.id = $1 and r.user_id = $2 and r.active`, [dayId, userId]);
    if (!d) continue;
    const kgN = String(form.get(`new_kg_${dayId}`) ?? '').replace(',', '.').trim();
    // Antes del cardio, si el día tiene
    const pos = await one<{ p: number }>(`select coalesce(max(position) filter (where kind = 'ejercicio'), 0) + 1 as p from day_items where day_id = $1 and not removed`, [dayId]);
    await q('update day_items set position = position + 1 where day_id = $1 and position >= $2', [dayId, pos!.p]);
    await q(`insert into day_items (day_id, position, kind, exercise_id, sets, reps, weight_kg) values ($1,$2,'ejercicio',$3,$4,$5,$6)`,
      [dayId, pos!.p, await exerciseId(name), Number(form.get(`new_sets_${dayId}`)) || 3, String(form.get(`new_reps_${dayId}`) || '').trim() || null, kgN === '' ? null : Number(kgN) || null]);
  }
  revalidatePath('/', 'layout');
  await q(`update routine_requests set status = 'Lista' where user_id = $1 and status = 'Enviado' and kind = 'ajuste'`, [userId]);
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

export type TempPwState = { password?: string; error?: string };

/** La dueña genera una contraseña provisoria para un socio que se olvidó la suya. */
export async function tempPassword(_prev: TempPwState, form: FormData): Promise<TempPwState> {
  await requireOwner();
  const id = Number(form.get('id'));
  // Sin letras que se confunden (l, 1, O, 0)
  const abc = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = crypto.randomBytes(8);
  const pw = `gym-${Array.from(bytes).map((b) => abc[b % abc.length]).join('').slice(0, 6)}`;
  const r = await one<{ id: number }>(`update users set pin_hash = $2, auth_provider = 'password' where id = $1 returning id`, [id, hashPassword(pw)]);
  if (!r) return { error: 'No encontramos al socio.' };
  return { password: pw };
}

// ---------- Cobros ----------
export async function saveCobros(form: FormData) {
  await requireOwner();
  const clean = (k: string) => String(form.get(k) || '').trim() || null;
  const mp = clean('mp_link');
  if (mp && !/^https:\/\//.test(mp)) redirect('/admin/gym?tab=cobros&error=link');
  await setSetting('pay_fee', clean('fee'));
  await setSetting('pay_day_fee', clean('day_fee'));
  await setSetting('pay_bank', clean('bank'));
  await setSetting('pay_mp_link', mp);
  await setSetting('pay_cash', form.get('cash') === 'on' ? 'si' : 'no');
  await setSetting('pay_cash_note', clean('cash_note'));
  revalidatePath('/perfil/pagar');
  redirect('/admin/gym?tab=cobros&guardado=1');
}

export async function confirmPayment(form: FormData) {
  await requireOwner();
  const id = Number(form.get('id'));
  const r = await one<{ user_id: number; paid_on: string }>(
    `update payment_reports set status = 'confirmado', reviewed_at = now() where id = $1 and status = 'pendiente'
     returning user_id, to_char(paid_on,'YYYY-MM-DD') as paid_on`, [id]);
  if (r) await addMonth(r.user_id, r.paid_on);
  revalidatePath('/admin', 'layout');
  redirect(String(form.get('back') || '/admin/gym?tab=cobros'));
}

export async function rejectPayment(form: FormData) {
  await requireOwner();
  await q(`update payment_reports set status = 'rechazado', reviewed_at = now() where id = $1 and status = 'pendiente'`, [Number(form.get('id'))]);
  revalidatePath('/admin', 'layout');
  redirect(String(form.get('back') || '/admin/gym?tab=cobros'));
}

// ---------- Máquinas y ejercicios ----------
export async function saveExercise(form: FormData) {
  await requireOwner();
  const id = Number(form.get('id'));
  const clean = (k: string) => String(form.get(k) || '').trim() || null;
  const name = clean('name');
  if (!name) redirect(`/admin/ejercicios/${id}?error=nombre`);
  const code = clean('machine_code')?.toUpperCase().replace(/\s+/g, '') ?? null;
  // Varias ejercicios pueden compartir máquina (ej.: la polea). La máquina puede tener nombre.
  const machineName = clean('machine_name');
  if (code) {
    await q(`insert into machines (code, name) values ($1, $2)
             on conflict (code) do update set name = coalesce(excluded.name, machines.name)`, [code, machineName]);
  }
  const video = clean('video_url');
  if (video && !/^https:\/\//.test(video)) redirect(`/admin/ejercicios/${id}?error=video`);
  const steps = String(form.get('steps') || '').split('\n').map((s) => s.replace(/^\s*\d+[.)-]\s*/, '').trim()).filter(Boolean);
  await q('update exercises set name = $2, muscle = $3, machine_code = $4, steps = $5, video_url = $6 where id = $1',
    [id, name, clean('muscle'), code, JSON.stringify(steps), video]);
  revalidatePath('/', 'layout');
  redirect(`/admin/ejercicios/${id}?guardado=1`);
}

// ---------- Calentamiento y enfriamiento ----------
export async function saveWarmup(form: FormData) {
  await requireOwner();
  const clean = (k: string) => String(form.get(k) || '').split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 20).join('\n').slice(0, 2000);
  await setSetting('warmup_steps', clean('warmup'));
  await setSetting('cooldown_steps', clean('cooldown'));
  redirect('/admin/gym?tab=calentamiento&guardado=1');
}
