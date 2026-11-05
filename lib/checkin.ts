// "¿Cómo llegás hoy?" / "¿Cómo te sentiste?": registro personal de cada sesión.
// Es privado: solo lo ve la socia (el panel de la dueña no lo lee).

export type Hormonal = 'ninguno' | 'ciclo' | 'menopausia';
export type Checkin = {
  energy: number | null; sleep: 'mal' | 'normal' | 'bien' | null; signals: string[]; period: boolean | null;
  note: string | null; rpe: number | null; after_note: string | null;
};
export const EMPTY: Checkin = { energy: null, sleep: null, signals: [], period: null, note: null, rpe: null, after_note: null };

export const ENERGY = [
  { v: 1, face: '😫', label: 'Muy baja' }, { v: 2, face: '😕', label: 'Baja' }, { v: 3, face: '😐', label: 'Normal' },
  { v: 4, face: '🙂', label: 'Buena' }, { v: 5, face: '💪', label: 'Excelente' },
];
export const SLEEP = [{ v: 'mal', label: 'Mal' }, { v: 'normal', label: 'Normal' }, { v: 'bien', label: 'Bien' }] as const;

const BASE = ['Cansancio', 'Dolor muscular', 'Resfrío o malestar', 'Estrés', 'Sin apetito', 'Dolor de cabeza'];
const CICLO = ['Cólicos', 'Hinchazón'];
const MENO = ['Sofocos', 'Sueño cortado', 'Dolor articular'];
export const signalsFor = (h: Hormonal) => [...BASE, ...(h === 'ciclo' ? CICLO : h === 'menopausia' ? MENO : [])];

export const rpeLabel = (n: number) => (n <= 3 ? 'Fácil' : n <= 6 ? 'Moderado' : n <= 8 ? 'Duro' : 'Al máximo');

/** Llegó con poca energía o con malestar: sugerir bajar la intensidad. */
export const lowDay = (c: Checkin | null) =>
  !!c && ((c.energy != null && c.energy <= 2) || c.signals.some((s) => ['Resfrío o malestar', 'Sin apetito', 'Dolor de cabeza'].includes(s)));

/**
 * Día del ciclo para una fecha, a partir de los días marcados "con período".
 * El inicio es el primer día de la última racha con período (se permiten huecos de hasta 2 días, porque no se entrena todos los días).
 */
export function cycleDay(periodDates: string[], iso: string): number | null {
  const ds = periodDates.filter((d) => d <= iso).sort();
  if (!ds.length) return null;
  const t = (d: string) => new Date(d + 'T12:00:00Z').getTime() / 86400000;
  let start = ds[ds.length - 1];
  for (let k = ds.length - 2; k >= 0; k--) { if (t(start) - t(ds[k]) <= 3) start = ds[k]; else break; }
  const n = Math.round(t(iso) - t(start)) + 1;
  return n >= 1 && n <= 45 ? n : null;
}
