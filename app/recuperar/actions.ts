'use server';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { hashPassword, setSession } from '@/lib/auth';
import { checkResetToken, resetToken } from '@/lib/reset';
import { emailEnabled, esc, sendEmail } from '@/lib/notify';

export type ResetState = { error?: string; sent?: boolean };

function origin() {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, '');
  const h = headers();
  return `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host')}`;
}

export async function requestReset(_prev: ResetState, form: FormData): Promise<ResetState> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Revisá el email.' };
  if (!emailEnabled()) return { error: 'Todavía no está activado el envío de emails. Pedile a la entrenadora que te genere una contraseña nueva.' };
  const u = await one<{ id: number; name: string; pin_hash: string }>('select id, name, pin_hash from users where email = $1', [email]);
  if (u) {
    const link = `${origin()}/recuperar/${resetToken(u.id, u.pin_hash)}`;
    await sendEmail([email], 'GYM MONTES · Elegí una contraseña nueva', `
      <p>Hola ${esc(u.name)},</p>
      <p>Para elegir una contraseña nueva, entrá a este link (vale por 1 hora):</p>
      <p><a href="${link}" style="display:inline-block;background:#9a3cb4;color:#fff;padding:12px 18px;border-radius:4px;text-decoration:none;font-weight:700">Elegir contraseña nueva</a></p>
      <p style="color:#6b6b6b;font-size:13px">Si no lo pediste, ignorá este email: tu contraseña no cambia.</p>`);
  }
  // Misma respuesta exista o no la cuenta
  return { sent: true };
}

export async function setNewPassword(_prev: ResetState, form: FormData): Promise<ResetState> {
  const token = String(form.get('token') || '');
  const pw = String(form.get('password') || '');
  if (pw.length < 8) return { error: 'La contraseña tiene que tener al menos 8 caracteres.' };
  const u = await checkResetToken(token);
  if (!u) return { error: 'Este link ya no sirve (venció o ya se usó). Pedí uno nuevo.' };
  const r = await one<{ role: string }>(`update users set pin_hash = $2, auth_provider = 'password' where id = $1 returning role`, [u.id, hashPassword(pw)]);
  setSession(u.id);
  redirect(r?.role === 'duena' ? '/admin' : '/');
}
