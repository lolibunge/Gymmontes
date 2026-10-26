import crypto from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { one } from './db';

export const COOKIE = 'gm_session';

function secret() {
  return process.env.AUTH_SECRET || 'gym-montes-demo-secret-cambiar';
}

export function sign(userId: number): string {
  const payload = `${userId}.${Date.now()}`;
  const mac = crypto.createHmac('sha256', secret()).update(payload).digest('hex');
  return `${payload}.${mac}`;
}

function verify(token: string | undefined): number | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [id, ts, mac] = parts;
  const expected = crypto.createHmac('sha256', secret()).update(`${id}.${ts}`).digest('hex');
  if (mac.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  return Number(id);
}

export function hashPassword(pw: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  return `${salt}:${crypto.scryptSync(pw, salt, 32).toString('hex')}`;
}

export function setSession(userId: number) {
  cookies().set(COOKIE, sign(userId), {
    httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 180,
  });
}

export function appOrigin(req: { nextUrl: { origin: string } }) {
  return process.env.APP_URL?.replace(/\/$/, '') || req.nextUrl.origin;
}

export function isOwnerEmail(email: string) {
  return (process.env.OWNER_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean).includes(email.toLowerCase());
}

export function googleEnabled() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function checkPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const test = crypto.scryptSync(pin, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(test), Buffer.from(hash));
}

export type User = {
  id: number; name: string; email: string; role: string; theme: string;
  phone: string | null; birth: string | null; weight_kg: string | null; height_cm: string | null;
  emergency: string | null; goals_text: string | null; goal_tags: string[]; member_since: string;
};

export async function currentUser(): Promise<User | null> {
  const id = verify(cookies().get(COOKIE)?.value);
  if (!id) return null;
  return one<User>(
    `select id, name, email, role, theme, phone, birth, weight_kg, height_cm, emergency, goals_text, goal_tags,
            to_char(member_since,'YYYY-MM-DD') as member_since from users where id = $1`,
    [id]
  );
}

export async function requireUser(): Promise<User> {
  const u = await currentUser();
  if (!u) redirect('/login');
  return u;
}
