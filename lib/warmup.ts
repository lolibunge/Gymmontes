import { q } from './db';

/** Un paso del calentamiento o del enfriamiento. `s`: segundos (null = sin tiempo, se marca a mano). */
export type WarmStep = { name: string; s: number | null };

export const DEFAULT_WARMUP = `Bici o cinta suave | 5 min
Círculos de cadera | 30 s
Sentadilla sin peso x10 | 45 s
Puente de glúteo x10 | 45 s
Rotaciones de hombros | 30 s`;

export const DEFAULT_COOLDOWN = `Estiramiento de cuádriceps (cada pierna) | 1 min
Estiramiento de isquiotibiales (cada pierna) | 1 min
Estiramiento de glúteo (cada pierna) | 1 min
Pecho y hombros en la pared | 30 s
Respiración profunda | 1 min`;

/**
 * Una línea por paso: "Nombre | 30 s", "Nombre | 5 min" o solo "Nombre".
 * Lo carga la entrenadora en Gym → Calentamiento.
 */
export function parseSteps(text: string): WarmStep[] {
  return text.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 20).map((l) => {
    const [name, t] = l.split('|').map((x) => x.trim());
    let s: number | null = null;
    if (t) {
      const n = Number((t.match(/\d+(?:[.,]\d+)?/)?.[0] ?? '').replace(',', '.'));
      if (n > 0) s = Math.round(/min|′|'/i.test(t) ? n * 60 : n);
    }
    return { name: name || l, s };
  });
}

export async function warmupSettings() {
  const rows = await q<{ key: string; value: string | null }>(
    `select key, value from gym_settings where key in ('warmup_steps','cooldown_steps')`
  );
  const v = (k: string, d: string) => rows.find((r) => r.key === k)?.value ?? d;
  const warmText = v('warmup_steps', DEFAULT_WARMUP);
  const coolText = v('cooldown_steps', DEFAULT_COOLDOWN);
  return { warmText, coolText, warm: parseSteps(warmText), cool: parseSteps(coolText) };
}
