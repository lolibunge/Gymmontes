'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { checkPin, COOKIE, sign } from '@/lib/auth';

export type LoginState = { error?: string };

export async function login(_prev: LoginState, form: FormData): Promise<LoginState> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const pin = String(form.get('pin') || '').trim();
  const next = String(form.get('next') || '/');
  if (!email || !pin) return { error: 'Completá tu email y tu PIN.' };
  let u: { id: number; pin_hash: string } | null;
  try {
    u = await one<{ id: number; pin_hash: string }>('select id, pin_hash from users where email = $1', [email]);
  } catch (e) {
    console.error('[login]', e);
    return { error: 'La app todavía no está conectada a la base de datos. Revisá DATABASE_URL en Vercel.' };
  }
  if (!u || !checkPin(pin, u.pin_hash)) return { error: 'El email o el PIN no coinciden.' };
  cookies().set(COOKIE, sign(u.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 180 });
  redirect(next.startsWith('/') && !next.startsWith('//') ? next : '/');
}

export async function logout() {
  cookies().delete(COOKIE);
  redirect('/login');
}
