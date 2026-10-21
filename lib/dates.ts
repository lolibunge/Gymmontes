const TZ = 'America/Montevideo';

/** Fecha de hoy en Montevideo, como 'YYYY-MM-DD'. */
export function today(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
}

/** 1 = lunes … 7 = domingo */
export function weekdayOf(iso: string): number {
  const d = new Date(iso + 'T12:00:00Z').getUTCDay();
  return d === 0 ? 7 : d;
}

export function addDays(iso: string, n: number): string {
  const d = new Date(iso + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00Z').getTime() - new Date(a + 'T12:00:00Z').getTime()) / 86400000);
}

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MESES_LARGO = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
export const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const DIAS_CORTO = ['', 'LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'];

export function toIso(d: string | Date): string {
  if (typeof d === 'string') return d.slice(0, 10);
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

export function corta(iso: string): string {
  const [, m, d] = iso.split('-').map(Number);
  return `${d} ${MESES[m - 1]}`;
}
export function dia2(iso: string): string {
  return iso.slice(8, 10);
}
export function mesCorto(iso: string): string {
  return MESES[Number(iso.slice(5, 7)) - 1].toUpperCase();
}
export function mesLargo(iso: string): string {
  return MESES_LARGO[Number(iso.slice(5, 7)) - 1];
}
