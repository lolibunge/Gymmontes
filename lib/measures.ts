// "Mis medidas": peso y medidas con cinta métrica, semana a semana. Privado (solo lo ve la socia).
export const METRICS = [
  { k: 'weight', label: 'Peso', unit: 'kg', hint: 'En ayunas, después de ir al baño' },
  { k: 'fat_pct', label: 'Grasa corporal', unit: '%', hint: 'Solo si tu balanza lo mide' },
  { k: 'waist', label: 'Cintura', unit: 'cm', hint: 'A la altura del ombligo, sin apretar' },
  { k: 'hip', label: 'Cadera', unit: 'cm', hint: 'En la parte más ancha de los glúteos' },
  { k: 'chest', label: 'Pecho / busto', unit: 'cm', hint: 'En la parte más ancha' },
  { k: 'arm', label: 'Brazo', unit: 'cm', hint: 'Mitad del brazo, relajado, siempre el mismo lado' },
  { k: 'thigh', label: 'Muslo', unit: 'cm', hint: 'Parte más ancha, siempre la misma pierna' },
  { k: 'calf', label: 'Pantorrilla', unit: 'cm', hint: 'Parte más ancha' },
] as const;
export type MetricKey = (typeof METRICS)[number]['k'];
export type Measure = { id: number; date: string; note: string | null } & Record<MetricKey, number | null>;

export const fmt = (n: number) => String(Math.round(n * 10) / 10).replace('.', ',');
