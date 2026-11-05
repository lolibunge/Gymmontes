// "Mis medidas": peso y medidas con cinta métrica, semana a semana. Privado (solo lo ve la socia).
// Brazo, muslo y pantorrilla se miden de cada lado, para ver la simetría entre izquierda y derecha.
// (arm / thigh / calf sin lado son de la v1.17: se siguen mostrando si alguien las cargó, pero ya no se piden.)
export const METRICS = [
  { k: 'weight', label: 'Peso', unit: 'kg', hint: 'En ayunas, después de ir al baño' },
  { k: 'fat_pct', label: 'Grasa corporal', unit: '%', hint: 'Solo si tu balanza lo mide' },
  { k: 'waist', label: 'Cintura', unit: 'cm', hint: 'A la altura del ombligo, sin apretar' },
  { k: 'hip', label: 'Cadera', unit: 'cm', hint: 'En la parte más ancha de los glúteos' },
  { k: 'chest', label: 'Pecho / busto', unit: 'cm', hint: 'En la parte más ancha' },
  { k: 'arm_l', label: 'Brazo izq.', unit: 'cm', hint: '' },
  { k: 'arm_r', label: 'Brazo der.', unit: 'cm', hint: '' },
  { k: 'thigh_l', label: 'Muslo izq.', unit: 'cm', hint: '' },
  { k: 'thigh_r', label: 'Muslo der.', unit: 'cm', hint: '' },
  { k: 'calf_l', label: 'Pantorrilla izq.', unit: 'cm', hint: '' },
  { k: 'calf_r', label: 'Pantorrilla der.', unit: 'cm', hint: '' },
  { k: 'arm', label: 'Brazo (sin lado)', unit: 'cm', hint: '', legacy: true },
  { k: 'thigh', label: 'Muslo (sin lado)', unit: 'cm', hint: '', legacy: true },
  { k: 'calf', label: 'Pantorrilla (sin lado)', unit: 'cm', hint: '', legacy: true },
] as const;
export type MetricKey = (typeof METRICS)[number]['k'];
export type Measure = { id: number; date: string; note: string | null } & Record<MetricKey, number | null>;

/** Medidas de un solo valor y medidas de a pares (izquierda / derecha). */
export const SINGLES: MetricKey[] = ['weight', 'fat_pct', 'waist', 'hip', 'chest', 'arm', 'thigh', 'calf'];
export const PAIRS: { label: string; l: MetricKey; r: MetricKey; hint: string }[] = [
  { label: 'Brazo', l: 'arm_l', r: 'arm_r', hint: 'Mitad del brazo, relajado, a la misma altura de los dos lados' },
  { label: 'Muslo', l: 'thigh_l', r: 'thigh_r', hint: 'Parte más ancha, a la misma distancia de la rodilla en las dos piernas' },
  { label: 'Pantorrilla', l: 'calf_l', r: 'calf_r', hint: 'Parte más ancha, de las dos piernas' },
];
export const FORM_KEYS = METRICS.filter((m) => !('legacy' in m)).map((m) => m.k);
export const meta = (k: MetricKey) => METRICS.find((m) => m.k === k)!;

export const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
