'use client';
import { useEffect, useRef, useState } from 'react';

/** Banner del Inicio que pasa solo entre las frases que carga la dueña (Gym → Frases). Se puede deslizar o tocar los puntitos. */
export default function PhraseBanner({ items }: { items: { id: number; text: string; author: string | null }[] }) {
  // Arranca en una frase distinta cada día, así no se ve siempre la misma primero
  const [k, setK] = useState(() => (items.length ? new Date().getDate() % items.length : 0));
  const [paused, setPaused] = useState(false);
  const touch = useRef<number | null>(null);
  useEffect(() => {
    if (items.length < 2 || paused) return;
    const id = setInterval(() => setK((x) => (x + 1) % items.length), 6000);
    return () => clearInterval(id);
  }, [items.length, paused]);
  if (!items.length) return null;
  const go = (d: number) => setK((x) => (x + d + items.length) % items.length);
  const p = items[k];
  return (
    <section aria-roledescription="carrusel" aria-label="Frases para entrenar" className="card bg-venda" style={{ gap: 10, padding: '16px 18px', overflow: 'hidden' }}
      onTouchStart={(e) => { touch.current = e.touches[0].clientX; setPaused(true); }}
      onTouchEnd={(e) => { const s = touch.current; touch.current = null; setPaused(false); if (s != null) { const dx = e.changedTouches[0].clientX - s; if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1); } }}>
      <span className="label brand">Para hoy</span>
      <blockquote key={p.id} aria-live="polite" style={{ margin: 0, minHeight: 50, animation: 'gm-fade .4s ease', fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 19, lineHeight: '24px', color: 'var(--guante)' }}>
        “{p.text}”
        {p.author && <footer className="caption muted" style={{ fontFamily: 'var(--font-inter)', fontWeight: 500, paddingTop: 6 }}>— {p.author}</footer>}
      </blockquote>
      {items.length > 1 && (
        <div role="tablist" aria-label="Elegir frase" style={{ display: 'flex', gap: 6 }}>
          {items.map((x, n) => (
            <button key={x.id} role="tab" aria-selected={n === k} aria-label={`Frase ${n + 1} de ${items.length}`} onClick={() => setK(n)}
              style={{ width: n === k ? 18 : 8, height: 8, borderRadius: 999, border: 0, padding: 0, cursor: 'pointer', background: n === k ? 'var(--violeta)' : 'var(--linea)', transition: 'width .2s' }} />
          ))}
        </div>
      )}
    </section>
  );
}
