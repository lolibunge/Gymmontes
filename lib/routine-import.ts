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
  raise?: boolean;
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

function segLabel(raw: string): string {
  const t = norm(raw.replace(/[.)]+$/, '')).replace(/^(de|a|al)\s+/, '').replace(/^ritmo\s+/, '');
  if (!t) return 'Tramo';
  if (t.startsWith('suave')) return 'Suave';
  if (t.startsWith('moderad')) return 'Moderado';
  if (t.startsWith('intens') || t.startsWith('fuerte') || t.startsWith('rapid')) return 'Intenso';
  const clean = raw.replace(/[.)]+$/, '').replace(/^(de|a|al)\s+/i, '').replace(/^ritmo\s+/i, '').trim();
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

export function parseSegments(v: string): { label: string; min: number }[] | null {
  const parts = v.split(/[;+]|\n/).map((p) => p.trim().replace(/\.$/, '')).filter(Boolean);
  const out: { label: string; min: number }[] = [];
  for (const p of parts) {
    // "6 x (1 Intenso / 2 Suave)"
    const rep = p.match(/^(\d+)\s*[x×]\s*\((.+)\)$/i);
    if (rep) {
      const inner = rep[2].split('/').map((x) => x.trim());
      for (let k = 0; k < Number(rep[1]); k++) for (const s of inner) { const one = parseSegments(s); if (one) out.push(...one); }
      continue;
    }
    // "18–20 min a ritmo moderado": con un rango se toma el número más alto.
    const m = p.match(/(\d+(?:[.,]\d+)?)(?:\s*[–—-]\s*(\d+(?:[.,]\d+)?))?\s*(?:min(?:utos?)?|′|')?\s*(.*)/i);
    if (!m) continue;
    const min = Number((m[2] ?? m[1]).replace(',', '.'));
    out.push({ label: segLabel(m[3]), min });
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
    if (rows.some((r) => r.some((c) => norm(c) === 'ejercicio'))) return parseTrainerSheet(rows);
    if (rows.some((r) => r.some((c) => norm(c) === 'fecha'))) {
      return { days: [], warnings: ['Ese link abre la pestaña del registro semanal. Abrí la pestaña con la rutina (la que tiene EJERCICIO, SERIES, REPETICIONES) y copiá el link de nuevo: cada pestaña tiene su propio link.'] };
    }
    return { days: [], warnings: ['No encontramos los ejercicios. La planilla tiene que tener una columna "Ejercicio" y los días (Lunes, Martes…), como la planilla modelo o la rutina de la entrenadora.'] };
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

/** Links de descarga CSV de la pestaña de un link de Google Sheets (export y gviz, por si uno falla). */
export function sheetsCsvUrls(link: string): string[] | null {
  const m = link.match(/docs\.google\.com\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!m) return null;
  const gid = link.match(/[#&?]gid=(\d+)/)?.[1] ?? '0';
  const base = `https://docs.google.com/spreadsheets/d/${m[1]}`;
  return [`${base}/export?format=csv&gid=${gid}`, `${base}/gviz/tq?tqx=out:csv&gid=${gid}`];
}

export function slugify(name: string) {
  return norm(name).replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'ejercicio';
}

// "TREN SUPERIOR A + CARDIO" → "Tren superior A + cardio" (la letra suelta antes de "+" o al final queda en mayúscula).
const sentence = (t: string) =>
  t === t.toUpperCase() ? (t.charAt(0) + t.slice(1).toLowerCase()).replace(/ ([a-zñ])(?= \+|$)/g, (_, l) => ` ${l.toUpperCase()}`) : t;
const FULL_DAYS: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 };
const CARDIO = /^(bicicleta|bici|cinta|caminadora|eliptica|eliptico|escaladora|remo ergometro|spinning|cardio)\b/;

/**
 * Formato de la entrenadora (como el PDF de GYM MONTES pasado a Google Sheets):
 *   01 | LUNES                       ← empieza un día
 *   CUÁDRICEPS + PECHO Y ESPALDA     ← enfoque
 *   EJERCICIO | | SERIES | REPETICIONES | PESO (KG) | ¿RANGO ALTO? | PRÓXIMA VEZ
 *   Sentadilla en hack | | 3 | 8–10 | 60.0 | No | Mantener
 *   BICICLETA · 26–28 MIN             ← cardio
 *   5 min suaves + 18–20 min a ritmo moderado + 3 min suaves.   ← tramos
 *   *Nota del día
 * Se corta en "INDICACIONES PARA ENTRENAR".
 */
function parseTrainerSheet(rows: string[][]): ParseResult {
  const warnings: string[] = [];
  const days: ParsedDay[] = [];
  let day: ParsedDay | null = null;
  let col: Record<string, number> | null = null;
  let pendingCardio: ParsedItem | null = null;
  const addNote = (d: ParsedDay, t: string) => { d.note = d.note ? `${d.note} ${t}` : t; };

  for (const r of rows) {
    const cells = r.map((c) => c.trim());
    const filled = cells.filter(Boolean);
    const n = filled.map(norm);
    if (!filled.length) continue;
    if (n.some((c) => c.startsWith('indicaciones para entrenar'))) break;

    // Encabezado de día: "01 | LUNES" o "LUNES" solo.
    const dayCell = n.find((c) => FULL_DAYS[c.replace(/^\d+\s*/, '')]);
    if (dayCell && filled.length <= 2) {
      const wd = FULL_DAYS[dayCell.replace(/^\d+\s*/, '')];
      day = { weekday: wd, title: TITLES[wd], subtitle: null, note: null, items: [] };
      days.push(day);
      col = null; pendingCardio = null;
      continue;
    }
    if (!day) continue;

    // Fila de títulos de columnas.
    const ej = n.indexOf('ejercicio');
    if (ej >= 0) {
      const find = (f: (h: string) => boolean) => cells.findIndex((c) => f(norm(c)));
      col = {
        ejercicio: cells.findIndex((c) => norm(c) === 'ejercicio'),
        series: find((h) => h === 'series' || h === 'sets'),
        reps: find((h) => h.startsWith('repeticiones') || h === 'reps'),
        peso: find((h) => h.startsWith('peso') || h === 'kg' || h === 'carga'),
        alto: find((h) => h.includes('rango alto')),
        proxima: find((h) => h.includes('proxima')),
      };
      continue;
    }

    // Una sola celda: enfoque, cardio, tramos o nota.
    if (filled.length === 1) {
      const t = filled[0];
      const tn = n[0];
      if (CARDIO.test(tn)) {
        const name = t.split(/[·•\-–—(]/)[0].trim();
        pendingCardio = { kind: 'cardio', name: name.charAt(0) + name.slice(1).toLowerCase(), sets: null, reps: null, weight: null, note: null, segments: null };
        day.items.push(pendingCardio);
        const total = tn.match(/(\d+)(?:\s*[–—-]\s*(\d+))?\s*min/);
        if (total) pendingCardio.segments = [{ label: 'Moderado', min: Number(total[2] ?? total[1]) }];
        continue;
      }
      if (pendingCardio && /\d/.test(t) && /min/i.test(t)) {
        const segs = parseSegments(t);
        if (segs) pendingCardio.segments = segs;
        else warnings.push(`No pudimos leer los tramos "${t}"; quedó el tiempo total.`);
        pendingCardio.note = t;
        pendingCardio = null;
        continue;
      }
      pendingCardio = null;
      if (!col && !day.subtitle) { day.subtitle = sentence(t.replace(/\s{2,}/g, ' ')); continue; }
      addNote(day, t);
      continue;
    }

    // Fila de ejercicio.
    if (!col) continue;
    const raw = cells[col.ejercicio] ?? '';
    if (!raw) continue;
    // "Peso muerto rumano*": el asterisco remite a la nota del día.
    const name = raw.replace(/\s*\*+$/, '');
    const starNote = name !== raw ? 'Ver la nota del día' : null;
    const get = (k: string) => (col![k] >= 0 ? cells[col![k]] ?? '' : '');
    const sets = num(get('series'));
    if (sets === null) warnings.push(`${day.title}: "${name}" no tiene series; se toma 3.`);
    const raise = norm(get('alto')) === 'si' || norm(get('proxima')).includes('subir');
    day.items.push({ kind: 'ejercicio', name, sets: sets ?? 3, reps: get('reps') || null, weight: num(get('peso')), note: starNote, segments: null, raise });
    pendingCardio = null;
  }
  const out = days.filter((d) => d.items.length);
  if (!out.length) warnings.unshift('No encontramos ejercicios debajo de los días.');
  return { days: out, warnings };
}
