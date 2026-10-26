'use server';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from '@/lib/db';
import { checkPin, COOKIE, hashPassword, isOwnerEmail, setSession } from '@/lib/auth';

export type FormState = { error?: string; field?: string };

const NOT_CONNECTED = 'La app todavía no está conectada a la base de datos. Revisá DATABASE_URL en Vercel.';
const safeNext = (n: string) => (n.startsWith('/') && !n.startsWith('//') ? n : '/');

export async function login(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const next = String(form.get('next') || '/');
  if (!email || !password) return { error: 'Completá tu email y tu contraseña.' };
  let u: { id: number; pin_hash: string; auth_provider: string; role: string } | null;
  try {
    u = await one('select id, pin_hash, auth_provider, role from users where email = $1', [email]);
  } catch (e) {
    console.error('[login]', e);
    return { error: NOT_CONNECTED };
  }
  if (u && u.auth_provider === 'google' && !u.pin_hash) return { error: 'Esta cuenta se creó con Google. Tocá "Continuar con Google".' };
  if (!u) return { error: 'No hay ninguna cuenta con ese email. Revisalo o creá tu cuenta.' };
  if (!checkPin(password, u.pin_hash)) return { error: 'La contraseña no coincide con la de ese email.' };
  setSession(u.id);
  if (isOwnerEmail(email) && u.role !== 'duena') {
    await one(`update users set role = 'duena' where id = $1`, [u.id]);
    u.role = 'duena';
  }
  if (u.role === 'duena' && (next === '/' || !next.startsWith('/admin'))) redirect('/admin');
  redirect(safeNext(next));
}

export async function register(_prev: FormState, form: FormData): Promise<FormState> {
  const name = String(form.get('name') || '').trim();
  const email = String(form.get('email') || '').trim().toLowerCase();
  const password = String(form.get('password') || '');
  const code = String(form.get('code') || '').trim();
  if (!name) return { error: 'Escribí tu nombre.', field: 'name' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: 'Revisá el email.', field: 'email' };
  if (password.length < 8) return { error: 'La contraseña tiene que tener al menos 8 caracteres.', field: 'password' };
  const gymCode = process.env.GYM_CODE;
  if (gymCode && code.toLowerCase() !== gymCode.toLowerCase()) return { error: 'El código del gimnasio no es correcto. Pedíselo a la entrenadora.', field: 'code' };
  let id: number;
  try {
    const exists = await one('select id from users where email = $1', [email]);
    if (exists) return { error: 'Ya hay una cuenta con ese email. Probá ingresar.', field: 'email' };
    const r = await one<{ id: number }>(
      `insert into users (name, email, pin_hash, auth_provider, role) values ($1,$2,$3,'password',$4) returning id`,
      [name, email, hashPassword(password), isOwnerEmail(email) ? 'duena' : 'socio']
    );
    id = r!.id;
  } catch (e) {
    console.error('[registro]', e);
    return { error: NOT_CONNECTED };
  }
  setSession(id);
  redirect(isOwnerEmail(email) ? '/admin' : '/?bienvenida=1');
}

export async function logout() {
  cookies().delete(COOKIE);
  redirect('/login');
}
