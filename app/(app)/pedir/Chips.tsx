'use client';
import { useState } from 'react';

const GOALS = ['Ganar fuerza', 'Bajar grasa', 'Resistencia', 'Volver de una lesión', 'Movilidad'];

export default function Chips() {
  const [goals, setGoals] = useState<string[]>([]);
  const [days, setDays] = useState(3);
  return (
    <>
      <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
        <legend className="label" style={{ paddingBottom: 12 }}>¿Qué buscás?</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {GOALS.map((g) => {
            const on = goals.includes(g);
            return (
              <button key={g} type="button" className="chip" aria-pressed={on} onClick={() => setGoals(on ? goals.filter((x) => x !== g) : [...goals, g])}>{g}</button>
            );
          })}
        </div>
        {goals.map((g) => <input key={g} type="hidden" name="goal" value={g} />)}
      </fieldset>
      <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
        <legend className="label" style={{ paddingBottom: 12 }}>Días por semana</legend>
        <div style={{ display: 'flex', gap: 8 }}>
          {[2, 3, 4, 5, 6].map((n) => (
            <button key={n} type="button" aria-pressed={n === days} onClick={() => setDays(n)}
              style={{ flex: 1, height: 52, border: 0, borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 20,
                background: n === days ? 'var(--violeta)' : 'var(--cuerda)', color: n === days ? 'var(--on-violeta)' : 'var(--campana)' }}>{n}</button>
          ))}
        </div>
        <input type="hidden" name="days" value={days} />
      </fieldset>
    </>
  );
}
