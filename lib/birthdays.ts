import { q } from './db';
import { today } from './dates';

/** Lee la fecha de nacimiento como la escriben los socios: 05/03/1995, 5-3-95, 05/03 o 1995-03-05. */
export function parseBirth(text: string | null | undefined): { d: number; m: number; y: number | null } | null {
  const t = (text ?? '').trim();
  if (!t) return null;
  let d: number, m: number, y: number | null = null;
  const iso = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const dmy = t.match(/^(\d{1,2})[\/\-. ](\d{1,2})(?:[\/\-. ](\d{2,4}))?$/);
  if (iso) { y = +iso[1]; m = +iso[2]; d = +iso[3]; }
  else if (dmy) { d = +dmy[1]; m = +dmy[2]; if (dmy[3]) { y = +dmy[3]; if (y < 100) y += y > Number(today().slice(2, 4)) ? 1900 : 2000; } }
  else return null;
  const max = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][m - 1];
  if (!max || d < 1 || d > max) return null;
  if (y != null && (y < 1900 || y > Number(today().slice(0, 4)))) return null;
  return { d, m, y };
}

/** Siempre se guarda igual: DD/MM/AAAA (o DD/MM si no puso el año). */
export function formatBirth(b: { d: number; m: number; y: number | null }) {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${p(b.d)}/${p(b.m)}${b.y ? `/${b.y}` : ''}`;
}

function isBirthday(b: { d: number; m: number }, iso: string) {
  const [y, m, d] = iso.split('-').map(Number);
  if (b.m === m && b.d === d) return true;
  // Los del 29/2 festejan el 28/2 cuando el año no es bisiesto
  const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
  return !leap && b.m === 2 && b.d === 29 && m === 2 && d === 28;
}

/** Socios que cumplen años hoy (solo los que dejaron que se muestre). */
export async function birthdaysToday(opts: { includeHidden?: boolean } = {}) {
  const rows = await q<{ id: number; name: string; birth: string; show_birthday: boolean }>(
    `select id, name, birth, show_birthday from users where role = 'socio' and coalesce(birth, '') <> ''`
  );
  const t = today();
  return rows
    .filter((r) => (opts.includeHidden || r.show_birthday) && (() => { const b = parseBirth(r.birth); return !!b && isBirthday(b, t); })())
    .map((r) => ({ id: r.id, name: r.name.trim(), first: r.name.trim().split(/\s+/)[0], hidden: !r.show_birthday }));
}
