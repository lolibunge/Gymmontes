// Lee una rutina desde una planilla (CSV o Google Sheets) con columnas:
// Día | Enfoque | Ejercicio | Series | Reps | Peso | Notas | Tramos
// - Una fila por ejercicio. "Enfoque" se toma de la primera fila de cada día.
// - Cardio: una fila con "Tramos", p. ej. "5 Suave; 20 Moderado; 3 Suave" (minutos + nombre).
// - Una fila con Día y sin Ejercicio sirve para escribir una nota del día (en "Notas").

export type ParsedItem = {
  kind: 'ejercicio' | 'cardio';
  name: string;
  sets: number | null;
  reps: string | null;
  weight: number | null;
  note: string | null;
  segments: { label: string; min: number }[] | null;
};
export type ParsedDay = { weekday: number; title: string; subtitle: string | null; note: string | null; items: ParsedItem[] };
export type ParseResult = { days: ParsedDay[]; warnings: string[] };

const DAYS: Record<string, number> = {
  lunes: 1, lun: 1, martes: 2, mar: 2, miercoles: 3, mie: 3, jueves: 4, jue: 4, viernes: 5, vie: 5,
  sabado: 6, sab: 6, domingo: 7, dom: 7, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
};
const TITLES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** CSV con comillas; detecta coma, punto y coma o tabulador. */
export function parseCSV(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const first = src.split(/\r?\n/)[0] ?? '';
  const delim = [';', '\t', ','].reduce((best, d) => (first.split(d).length > first.split(best).length ? d : best), ',');
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') quoted = false;
      else cell += c;
    } else if (c === '"') quoted = true;
    else if (c === delim) { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(cell); rows.push(row); row = []; cell = '';
    } else cell += c;
  }
  if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
  return rows.map((r) => r.map((x) => x.trim())).filter((r) => r.some((x) => x !== ''));
}

const COLS: Record<string, string[]> = {
  dia: ['dia', 'day'],
  enfoque: ['enfoque', 'grupo', 'titulo', 'tipo'],
  ejercicio: ['ejercicio', 'exercise'],
  series: ['series', 'sets'],
  reps: ['reps', 'repeticiones'],
  peso: ['peso', 'peso (kg)', 'kg', 'carga'],
  notas: ['notas', 'nota', 'observaciones'],
  tramos: ['tramos', 'cardio', 'intervalos'],
};

function num(v: string | undefined): number | null {
  if (!v) return null;
  const m = v.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseSegments(v: string): { label: string; min: number }[] | null {
  const parts = v.split(/[;+]|\n/).map((p) => p.trim()).filter(Boolean);
  const out: { label: string; min: number }[] = [];
  for (const p of parts) {
    // "6 x (1 Intenso / 2 Suave)"
    const rep = p.match(/^(\d+)\s*[x×]\s*\((.+)\)$/i);
    if (rep) {
      const inner = rep[2].split('/').map((x) => x.trim());
      for (let k = 0; k < Number(rep[1]); k++) for (const s of inner) { const one = parseSegments(s); if (one) out.push(...one); }
      continue;
    }
    const m = p.match(/(\d+(?:[.,]\d+)?)\s*(?:min|′|')?\s*(.*)/i);
    if (!m) continue;
    const label = (m[2] || 'Tramo').replace(/^(de|a)\s+/i, '').trim();
    out.push({ label: label.charAt(0).toUpperCase() + label.slice(1), min: Number(m[1].replace(',', '.')) });
  }
  return out.length ? out : null;
}

export function parseRoutine(rows: string[][]): ParseResult {
  const warnings: string[] = [];
  if (!rows.length) return { days: [], warnings: ['La planilla está vacía.'] };
  const head = rows[0].map(norm);
  const idx: Record<string, number> = {};
  for (const [k, names] of Object.entries(COLS)) idx[k] = head.findIndex((h) => names.includes(h));
  if (idx.dia < 0 || idx.ejercicio < 0) {
    return { days: [], warnings: ['No encontramos las columnas "Día" y "Ejercicio" en la primera fila. Usá la planilla modelo.'] };
  }
  const get = (r: string[], k: string) => (idx[k] >= 0 ? (r[idx[k]] ?? '').trim() : '');
  const byDay = new Map<number, ParsedDay>();
  let current: number | null = null;
  rows.slice(1).forEach((r, i) => {
    const line = i + 2;
    const dRaw = get(r, 'dia');
    if (dRaw) {
      const wd = DAYS[norm(dRaw).replace(/[^a-z0-9]/g, '')];
      if (!wd) { warnings.push(`Fila ${line}: no reconocemos el día "${dRaw}".`); return; }
      current = wd;
    }
    if (!current) { warnings.push(`Fila ${line}: falta el día.`); return; }
    if (!byDay.has(current)) byDay.set(current, { weekday: current, title: TITLES[current], subtitle: null, note: null, items: [] });
    const day = byDay.get(current)!;
    const enfoque = get(r, 'enfoque');
    if (enfoque && !day.subtitle) day.subtitle = enfoque;
    const name = get(r, 'ejercicio');
    const tramos = get(r, 'tramos');
    const notas = get(r, 'notas') || null;
    if (!name) {
      if (notas) day.note = day.note ? `${day.note} ${notas}` : notas;
      return;
    }
    if (tramos) {
      const segs = parseSegments(tramos);
      if (!segs) warnings.push(`Fila ${line}: no pudimos leer los tramos "${tramos}".`);
      day.items.push({ kind: 'cardio', name, sets: null, reps: null, weight: null, note: notas, segments: segs });
      return;
    }
    const sets = num(get(r, 'series'));
    if (sets === null) warnings.push(`Fila ${line}: "${name}" no tiene series; se toma 3.`);
    day.items.push({ kind: 'ejercicio', name, sets: sets ?? 3, reps: get(r, 'reps') || null, weight: num(get(r, 'peso')), note: notas, segments: null });
  });
  const days = [...byDay.values()].filter((d) => d.items.length).sort((a, b) => a.weekday - b.weekday);
  if (!days.length && !warnings.length) warnings.push('No encontramos ejercicios en la planilla.');
  return { days, warnings };
}

/** Convierte un link de Google Sheets en el link de descarga CSV de esa pestaña. */
export function sheetsCsvUrl(link: string): string | null {
  const m = link.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const gid = link.match(/[#&?]gid=(\d+)/)?.[1] ?? '0';
  return `https://docs.google.com/spreadsheets/d/${m[1]}/export?format=csv&gid=${gid}`;
}

export function slugify(name: string) {
  return norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ejercicio';
}
