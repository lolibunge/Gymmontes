/**
 * Dibujo propio del cuerpo (de frente y de espalda) con los músculos que trabaja un ejercicio, pintados con el color de la app.
 * Los músculos salen del texto de la ficha ("Piernas · cuádriceps y glúteos") y del nombre del ejercicio.
 */
type M = 'hombros' | 'pecho' | 'biceps' | 'triceps' | 'antebrazos' | 'abdominales' | 'oblicuos' | 'trapecio' | 'dorsales'
  | 'lumbares' | 'gluteos' | 'abductores' | 'aductores' | 'cuadriceps' | 'isquios' | 'gemelos';

export const LABEL: Record<M, string> = {
  hombros: 'Hombros', pecho: 'Pecho', biceps: 'Bíceps', triceps: 'Tríceps', antebrazos: 'Antebrazos', abdominales: 'Abdominales',
  oblicuos: 'Oblicuos', trapecio: 'Trapecio', dorsales: 'Espalda (dorsales)', lumbares: 'Espalda baja', gluteos: 'Glúteos',
  abductores: 'Glúteo medio', aductores: 'Aductores', cuadriceps: 'Cuádriceps', isquios: 'Isquiotibiales', gemelos: 'Gemelos',
};

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const RULES: [RegExp, M[]][] = [
  [/cuadricep|sentadilla|prensa|extension de cuadricep|step-up|bulgara|zancada|estocada/, ['cuadriceps']],
  [/isquio|femoral|peso muerto|curl femoral/, ['isquios']],
  [/gluteo medio|abduc|patada lateral/, ['abductores']],
  [/gluteo|hip thrust|puente/, ['gluteos']],
  [/aductor/, ['aductores']],
  [/gemelo|pantorrilla|talon/, ['gemelos']],
  [/pecho|pectoral|press de pecho|press inclinado|apertura/, ['pecho']],
  [/romboide|trapecio/, ['trapecio']],
  [/espalda baja|lumbar/, ['lumbares']],
  [/dorsal|espalda|jalon|remo|dominada/, ['dorsales']],
  [/hombro|deltoid|elevaciones? lateral|press de hombro|press militar/, ['hombros']],
  [/tricep/, ['triceps']],
  [/bicep|curl(?! femoral)/, ['biceps']],
  [/antebrazo|martillo/, ['antebrazos']],
  [/oblicu/, ['oblicuos']],
  [/abdom|core|crunch|plancha|zona media/, ['abdominales']],
];

/** Músculos que trabaja, en el orden en que aparecen en la ficha (el primero es el principal). */
export function musclesFor(muscle: string | null | undefined, name = ''): M[] {
  const out: M[] = [];
  const add = (ms: M[]) => ms.forEach((m) => { if (!out.includes(m)) out.push(m); });
  // Primero lo que dice la ficha, en orden; si no dice nada útil, el nombre del ejercicio
  // Cada parte del texto suma un solo músculo (la primera regla que coincide: "espalda baja" no es "espalda")
  for (const part of norm(muscle ?? '').split(/·|,|\sy\s|\(|\)/)) { const hit = RULES.find(([re]) => re.test(part.trim())); if (hit) add(hit[1]); }
  if (!out.length) for (const [re, ms] of RULES) if (re.test(norm(name))) add(ms);
  if (!out.length && /pierna/.test(norm(muscle ?? ''))) add(['cuadriceps', 'isquios', 'gluteos', 'gemelos']);
  if (out.includes('abdominales') && /core/.test(norm(muscle ?? ''))) add(['oblicuos']);
  return out;
}

type Shape = { m: M; d?: string; e?: [number, number, number, number]; r?: [number, number, number, number] };

// Silueta (base gris) y músculos. viewBox 0 0 100 220.
const BODY = (
  <>
    <circle cx="50" cy="15" r="10" />
    <rect x="45" y="24" width="10" height="8" rx="2" />
    <path d="M28 36 Q50 29 72 36 L73 72 Q71 94 67 106 L33 106 Q29 94 27 72 Z" />
    <rect x="17" y="37" width="12" height="36" rx="6" transform="rotate(8 23 55)" />
    <rect x="71" y="37" width="12" height="36" rx="6" transform="rotate(-8 77 55)" />
    <rect x="13" y="71" width="10" height="34" rx="5" transform="rotate(6 18 88)" />
    <rect x="77" y="71" width="10" height="34" rx="5" transform="rotate(-6 82 88)" />
    <path d="M33 104 L67 104 L69 118 L31 118 Z" />
    <rect x="31" y="114" width="17" height="52" rx="8" />
    <rect x="52" y="114" width="17" height="52" rx="8" />
    <rect x="33" y="164" width="13" height="44" rx="6" />
    <rect x="54" y="164" width="13" height="44" rx="6" />
  </>
);

const FRONT: Shape[] = [
  { m: 'hombros', e: [28, 41, 7, 6] }, { m: 'hombros', e: [72, 41, 7, 6] },
  { m: 'pecho', e: [41, 49, 9, 7] }, { m: 'pecho', e: [59, 49, 9, 7] },
  { m: 'biceps', e: [22.5, 57, 4.5, 10] }, { m: 'biceps', e: [77.5, 57, 4.5, 10] },
  { m: 'antebrazos', e: [18, 87, 4, 12] }, { m: 'antebrazos', e: [82, 87, 4, 12] },
  { m: 'abdominales', r: [44, 59, 12, 36] },
  { m: 'oblicuos', e: [36, 78, 4, 12] }, { m: 'oblicuos', e: [64, 78, 4, 12] },
  { m: 'aductores', e: [46.5, 128, 2.5, 12] }, { m: 'aductores', e: [53.5, 128, 2.5, 12] },
  { m: 'cuadriceps', e: [39, 140, 7, 21] }, { m: 'cuadriceps', e: [61, 140, 7, 21] },
  { m: 'gemelos', e: [39.5, 182, 4, 12] }, { m: 'gemelos', e: [60.5, 182, 4, 12] },
];
const BACK: Shape[] = [
  { m: 'trapecio', d: 'M39 33 L61 33 L57 52 L50 56 L43 52 Z' },
  { m: 'hombros', e: [28, 41, 7, 6] }, { m: 'hombros', e: [72, 41, 7, 6] },
  { m: 'dorsales', e: [38, 66, 8, 15] }, { m: 'dorsales', e: [62, 66, 8, 15] },
  { m: 'triceps', e: [22.5, 57, 4.5, 10] }, { m: 'triceps', e: [77.5, 57, 4.5, 10] },
  { m: 'antebrazos', e: [18, 87, 4, 12] }, { m: 'antebrazos', e: [82, 87, 4, 12] },
  { m: 'lumbares', r: [44, 82, 12, 18] },
  { m: 'abductores', e: [34, 106, 4, 6] }, { m: 'abductores', e: [66, 106, 4, 6] },
  { m: 'gluteos', e: [42, 114, 9, 9] }, { m: 'gluteos', e: [58, 114, 9, 9] },
  { m: 'isquios', e: [39.5, 144, 7, 18] }, { m: 'isquios', e: [60.5, 144, 7, 18] },
  { m: 'gemelos', e: [39.5, 182, 5.5, 13] }, { m: 'gemelos', e: [60.5, 182, 5.5, 13] },
];

function Figure({ shapes, on, main, label, size }: { shapes: Shape[]; on: M[]; main: M | undefined; label: string; size: number }) {
  return (
    <figure style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
      <svg width={size * 0.45} height={size} viewBox="0 0 100 220" aria-hidden="true">
        <g fill="var(--cuerda)" stroke="var(--linea)" strokeWidth="1.5">{BODY}</g>
        {shapes.map((s, k) => {
          const active = on.includes(s.m);
          const p = { key: k, fill: active ? 'var(--violeta)' : 'var(--linea)', opacity: active ? (s.m === main ? 1 : 0.6) : 0.55 };
          if (s.d) return <path {...p} d={s.d} />;
          if (s.r) return <rect {...p} x={s.r[0]} y={s.r[1]} width={s.r[2]} height={s.r[3]} rx="4" />;
          const [cx, cy, rx, ry] = s.e!;
          return <ellipse {...p} cx={cx} cy={cy} rx={rx} ry={ry} />;
        })}
      </svg>
      <figcaption style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }} className="muted">{label}</figcaption>
    </figure>
  );
}

/** Frente y espalda, con chips de los músculos al costado. */
export default function MuscleMap({ muscle, name, size = 120 }: { muscle: string | null | undefined; name?: string; size?: number }) {
  const on = musclesFor(muscle, name);
  if (!on.length) return null;
  const front = FRONT.some((s) => on.includes(s.m));
  const back = BACK.some((s) => on.includes(s.m));
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }} aria-label={`Trabaja: ${on.map((m) => LABEL[m]).join(', ')}`}>
      <div style={{ display: 'flex', gap: 4 }}>
        {front && <Figure shapes={FRONT} on={on} main={on[0]} label="FRENTE" size={size} />}
        {back && <Figure shapes={BACK} on={on} main={on[0]} label="ESPALDA" size={size} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="caption muted">Trabaja</span>
        {on.map((m, k) => (
          <span key={m} className="badge" style={{ alignSelf: 'flex-start', background: k === 0 ? 'var(--violeta)' : 'var(--venda)', color: k === 0 ? 'var(--on-violeta)' : 'var(--violeta-texto)', fontWeight: 600 }}>{LABEL[m]}</span>
        ))}
      </div>
    </div>
  );
}
