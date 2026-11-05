/**
 * Cinta de frases arriba de todas las pantallas del socio: pasa sola de derecha a izquierda, sin fin.
 * Las frases las carga la dueña en Gym → Frases. Con "reducir movimiento" del teléfono queda quieta.
 */
export default function PhraseTicker({ items }: { items: { id: number; text: string; author: string | null }[] }) {
  if (!items.length) return null;
  const line = items.map((p) => (p.author ? `“${p.text}” — ${p.author}` : `“${p.text}”`));
  // Velocidad pareja: más texto, más tiempo (≈ 7 caracteres por segundo)
  const chars = line.join('').length + line.length * 6;
  const dur = Math.max(20, Math.round(chars / 7));
  const Row = ({ hidden }: { hidden?: boolean }) => (
    <span className="ticker-row" aria-hidden={hidden || undefined}>
      {line.map((t, k) => (
        <span key={k} className="ticker-item">{t}<span className="ticker-sep" aria-hidden="true">✦</span></span>
      ))}
    </span>
  );
  return (
    <div className="ticker" role="marquee" aria-label="Frases para entrenar">
      <div className="ticker-track" style={{ animationDuration: `${dur}s` }}>
        <Row />
        <Row hidden />
      </div>
    </div>
  );
}
