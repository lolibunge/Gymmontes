'use server';
import { revalidatePath } from 'next/cache';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { today } from '@/lib/dates';
import { emailOwner, esc } from '@/lib/notify';
import { METHOD_LABEL } from '@/lib/payments';

export type ReportState = { ok?: boolean; error?: string };

const TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf'];

/** El socio avisa que pagó (transferencia o Mercado Pago). La dueña lo confirma. */
export async function reportPayment(_prev: ReportState, form: FormData): Promise<ReportState> {
  const user = await requireUser();
  const method = String(form.get('method') || '');
  if (!['transferencia', 'mercadopago'].includes(method)) return { error: 'Elegí cómo pagaste.' };
  const paidOn = String(form.get('paid_on') || today());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(paidOn) || paidOn > today()) return { error: 'Revisá la fecha del pago.' };
  const note = String(form.get('note') || '').trim().slice(0, 300) || null;
  let receipt: Buffer | null = null;
  let type: string | null = null;
  const file = form.get('receipt');
  if (file instanceof File && file.size > 0) {
    if (file.size > 3_500_000) return { error: 'El comprobante pesa mucho. Mandá una captura de pantalla (máximo 3 MB).' };
    if (!TYPES.includes(file.type)) return { error: 'El comprobante tiene que ser una foto o un PDF.' };
    receipt = Buffer.from(await file.arrayBuffer());
    type = file.type;
  }
  await q(`update payment_reports set status = 'reemplazado' where user_id = $1 and status = 'pendiente'`, [user.id]);
  await q('insert into payment_reports (user_id, method, paid_on, note, receipt, receipt_type) values ($1,$2,$3,$4,$5,$6)',
    [user.id, method, paidOn, note, receipt, type]);
  const base = process.env.APP_URL || 'https://gymmontes.vercel.app';
  await emailOwner(`Pago informado: ${user.name}`,
    `<p style="font-family:Arial"><b>${esc(user.name)}</b> informó que pagó la cuota por <b>${METHOD_LABEL[method]}</b> el ${paidOn}.${note ? `<br>${esc(note)}` : ''}</p>
     <p style="font-family:Arial"><a href="${base}/admin/gym?tab=cobros">Confirmar el pago</a></p>`);
  revalidatePath('/perfil/pagar');
  return { ok: true };
}
