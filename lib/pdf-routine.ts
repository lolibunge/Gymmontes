// Lee la rutina desde el PDF de "Planificación de entrenamiento" de GYM MONTES
// (el que se genera con la plantilla del gym: días numerados, tabla EJERCICIO / SERIES / REPETICIONES,
// notas debajo de cada tabla y el cardio como "BICICLETA · 26 MIN" con los tramos en la línea siguiente).
// Usa la posición de cada texto en la página para separar las columnas.
import { getDocumentProxy } from 'unpdf';
import { norm, parseSegments, type ParsedDay, type ParsedItem } from './routine-import';

type Cell = { x: number; y: number; h: number; s: string };
type Line = { page: number; y: number; h: number; cells: Cell[] };

const DAY_NAMES: Record<string, number> = { lunes: 1, martes: 2, miercoles: 3, jueves: 4, viernes: 5, sabado: 6, domingo: 7 };
const TITLES = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const CARDIO = /^(bici(cleta)?|cinta|eliptic[oa]|remo ergometro|caminata|escaladora|cardio)\b/;

/** "TREN SUPERIOR A + CARDIO" → "Tren superior A + cardio" (las letras sueltas quedan en mayúscula). */
const cap = (s: string) => {
  // Letra suelta que identifica una variante ("A", "B"): al final o antes de "+". "y", "o", "e" quedan como palabra.
  const t = s.trim().toLowerCase().replace(/(^|\s)([a-df-np-xzñ])(?=\s*(\+|$))/g, (_m, sp, ch) => sp + ch.toUpperCase());
  return t.charAt(0).toUpperCase() + t.slice(1);
};
const hasLower = (s: string) => /[a-záéíóúñü]/.test(s);

async function readLines(data: Uint8Array): Promise<Line[]> {
  const pdf = await getDocumentProxy(data);
  const out: Line[] = [];
  for (let p = 1; p <= pdf.numPages; p++) {
    const page = await pdf.getPage(p);
    const { height } = page.getViewport({ scale: 1 });
    const tc = await page.getTextContent();
    const cells: Cell[] = [];
    for (const it of tc.items as any[]) {
      const s = String(it.str ?? '').trim();
      if (!s) continue;
      const y = it.transform[5];
      // Encabezado y pie que se repiten en cada página
      if (y > height - 60 || y < 35) continue;
      cells.push({ x: it.transform[4], y, h: it.height || Math.abs(it.transform[3]), s });
    }
    cells.sort((a, b) => b.y - a.y || a.x - b.x);
    const lines: Line[] = [];
    for (const c of cells) {
      const l = lines.find((x) => Math.abs(x.y - c.y) <= 2.5);
      if (l) { l.cells.push(c); l.h = Math.max(l.h, c.h); } else lines.push({ page: p, y: c.y, h: c.h, cells: [c] });
    }
    for (const l of lines) l.cells.sort((a, b) => a.x - b.x);
    out.push(...lines);
  }
  return out;
}

export async function parseRoutinePdf(data: Uint8Array): Promise<{ days: ParsedDay[]; warnings: string[]; objective: string | null; title: string | null }> {
  const warnings: string[] = [];
  let lines: Line[];
  try { lines = await readLines(data); } catch {
    return { days: [], warnings: ['No pudimos abrir el PDF. Probá exportarlo de nuevo o usá la planilla.'], objective: null, title: null };
  }
  if (!lines.length) {
    return { days: [], warnings: ['El PDF no tiene texto (puede ser una foto o un escaneo). Usá el PDF original de la planilla o un link de Google Sheets.'], objective: null, title: null };
  }

  const days: ParsedDay[] = [];
  let day: ParsedDay | null = null;
  let mode: 'none' | 'subtitle' | 'table' | 'after' | 'cardio' = 'none';
  let cols = { series: 0, reps: 0 };
  let objective: string[] | null = null;
  let objDone = false;
  let title: string | null = null;
  let bigName = false;

  const text = (l: Line) => l.cells.map((c) => c.s).join(' ').replace(/\s+/g, ' ').trim();
  const addNote = (s: string) => { if (day) day.note = day.note ? `${day.note} ${s}` : s; };

  for (const l of lines) {
    const t = text(l);
    const n = norm(t);

    // Portada: nombre grande, luego el título de la rutina y los objetivos
    if (!days.length && !day) {
      if (l.h >= 24) { bigName = true; continue; }
      if (bigName && !title && !hasLower(t) && l.h >= 10) { title = cap(t); continue; }
      if (n === 'objetivos') { objective = []; continue; }
      if (objective && !objDone) { if (hasLower(t)) { objective.push(t); continue; } objDone = true; }
    }

    // Números sueltos ("01", "02"…) que acompañan el nombre del día
    if (/^\d{1,2}$/.test(t)) continue;

    // "01  LUNES" / "LUNES": empieza un día
    const dayWord = l.cells.map((c) => norm(c.s)).find((w) => DAY_NAMES[w]);
    if (dayWord && l.h >= 12 && l.cells.length <= 2) {
      const wd = DAY_NAMES[dayWord];
      day = days.find((d) => d.weekday === wd) ?? null;
      if (!day) { day = { weekday: wd, title: TITLES[wd], subtitle: null, note: null, items: [] }; days.push(day); }
      mode = 'subtitle';
      continue;
    }
    // Títulos grandes de sección ("MIÉRCOLES Y JUEVES", "INDICACIONES PARA ENTRENAR"…): termina el día
    if (l.h >= 16 || (!hasLower(t) && l.cells.length === 1 && t.length > 12 && mode !== 'subtitle' && !CARDIO.test(n))) {
      day = null; mode = 'none';
      continue;
    }
    if (!day) continue;

    if (mode === 'subtitle') {
      if (!hasLower(t)) { day.subtitle = cap(t); mode = 'after'; continue; }
      mode = 'after';
    }

    // Encabezado de la tabla: guarda dónde están las columnas
    const cn = l.cells.map((c) => norm(c.s));
    if (cn.includes('ejercicio')) {
      const sx = l.cells[cn.findIndex((c) => c === 'series' || c === 'sets')]?.x ?? 0;
      const rx = l.cells[cn.findIndex((c) => c === 'repeticiones' || c === 'reps')]?.x ?? 0;
      cols = { series: sx, reps: rx };
      mode = 'table';
      continue;
    }

    // Cardio: "BICICLETA · 26–28 MIN" y abajo los tramos
    const cardio = t.match(/^(.+?)\s*[·•-]\s*(\d+(?:\s*[–-]\s*\d+)?)\s*min/i);
    if (cardio && CARDIO.test(norm(cardio[1]))) {
      const item: ParsedItem = { kind: 'cardio', name: cap(cardio[1]), sets: null, reps: null, weight: null, note: null, segments: null };
      day.items.push(item);
      mode = 'cardio';
      const total = Number(cardio[2].split(/[–-]/).pop());
      item.segments = [{ label: 'Moderado', min: total }];
      continue;
    }
    if (mode === 'cardio') {
      const item = day.items[day.items.length - 1];
      const segs = parseSegments(t);
      if (segs) { item.segments = segs; item.note = t; }
      else warnings.push(`${TITLES[day.weekday]}: no entendimos los tramos de "${item.name}" (${t}). Quedó como un solo tramo.`);
      mode = 'after';
      continue;
    }

    // Fila de la tabla: nombre a la izquierda, series y repeticiones en sus columnas
    if (mode === 'table' && cols.series) {
      const name = l.cells.filter((c) => c.x < cols.series - 15).map((c) => c.s).join(' ').trim();
      const sets = l.cells.find((c) => c.x >= cols.series - 15 && c.x < cols.reps - 15 && /^\d+$/.test(c.s));
      const reps = l.cells.filter((c) => c.x >= cols.reps - 30).map((c) => c.s).join(' ').trim();
      if (name && sets) {
        const star = /\*\s*$/.test(name);
        day.items.push({
          kind: 'ejercicio', name: name.replace(/\*+\s*$/, '').trim(), sets: Number(sets.s), reps: reps || null,
          weight: null, note: star ? 'Ver nota *' : null, segments: null,
        });
        continue;
      }
      mode = 'after';
    }

    // Texto suelto debajo de la tabla: nota del día ("Priorizar la técnica…", "*Incorporar… solo si…")
    if (hasLower(t)) addNote(t);
  }

  // Si una nota con * habla de un ejercicio, se la pegamos a ese ejercicio
  for (const d of days) {
    const starNotes = (d.note ?? '').match(/\*[^*]+/g) ?? [];
    for (const sn of starNotes) {
      const txt = sn.replace(/^\*/, '').trim();
      const target = d.items.find((it) => it.note === 'Ver nota *' && norm(txt).includes(norm(it.name).split(' ').slice(0, 2).join(' ')))
        ?? d.items.find((it) => it.note === 'Ver nota *');
      if (target) { target.note = txt; d.note = (d.note ?? '').replace(sn, '').trim() || null; }
    }
    for (const it of d.items) if (it.note === 'Ver nota *') it.note = null;
    if (!d.items.length) warnings.push(`${TITLES[d.weekday]}: no encontramos ejercicios.`);
  }
  if (!days.length) warnings.unshift('No encontramos los días (LUNES, MARTES…) en el PDF. Este lector funciona con la planilla de entrenamiento de GYM MONTES; para otros formatos usá Google Sheets.');
  else warnings.push('El PDF no trae pesos: los carga el socio en su primera sesión (o podés ponerlos en "Editar rutina").');
  return { days: days.sort((a, b) => a.weekday - b.weekday), warnings, objective: objective?.length ? objective.join(' ') : null, title };
}
