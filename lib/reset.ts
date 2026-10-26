import crypto from 'node:crypto';
import { one } from './db';

// Link para elegir una contraseña nueva. Vale 1 hora y una sola vez:
// la firma incluye la contraseña actual, así que al cambiarla el link deja de servir.
const secret = () => process.env.AUTH_SECRET || 'gym-montes-demo-secret-cambiar';
const mac = (id: number, exp: number, pinHash: string) =>
  crypto.createHmac('sha256', secret()).update(`reset.${id}.${exp}.${pinHash}`).digest('base64url');

export function resetToken(id: number, pinHash: string): string {
  const exp = Date.now() + 60 * 60 * 1000;
  return `${id}.${exp}.${mac(id, exp, pinHash)}`;
}

export async function checkResetToken(token: string): Promise<{ id: number; name: string; email: string } | null> {
  const [idS, expS, sig] = token.split('.');
  const id = Number(idS), exp = Number(expS);
  if (!id || !exp || !sig || exp < Date.now()) return null;
  const u = await one<{ id: number; name: string; email: string; pin_hash: string }>('select id, name, email, pin_hash from users where id = $1', [id]);
  if (!u) return null;
  const want = mac(id, exp, u.pin_hash);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  return { id: u.id, name: u.name, email: u.email };
}
