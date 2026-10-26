'use client';
import { useState } from 'react';

export const CHANGES = ['Cambiar un ejercicio', 'Agregar algo', 'Sacar algo', 'Me molesta un ejercicio', 'Cambiar los días'];

/** Pedido de ajuste: qué cambiar, de qué día y de qué ejercicio. */
export default function AdjustChips({ days, exercises }: { days: { weekday: number; label: string }[]; exercises: string[] }) {
  const [change, setChange] = useState(CHANGES[0]);
  const [day, setDay] = useState<number | null>(null);
  const showExercise = change !== 'Agregar algo' && change !== 'Cambiar los días';
  return (
    <>
      <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
        <legend className="label" style={{ paddingBottom: 12 }}>¿Qué querés cambiar?</legend>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {CHANGES.map((c) => (
            <button key={c} type="button" className="chip" aria-pressed={c === change} onClick={() => setChange(c)}>{c}</button>
          ))}
        </div>
        <input type="hidden" name="change" value={change} />
      </fieldset>
      {change !== 'Cambiar los días' && (
        <fieldset style={{ margin: 0, padding: 0, border: 0 }}>
          <legend className="label" style={{ paddingBottom: 12 }}>¿Qué día?</legend>
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ weekday: 0, label: 'Todos' }, ...days].map((d) => {
              const on = (day ?? 0) === d.weekday;
              return (
                <button key={d.weekday} type="button" aria-pressed={on} onClick={() => setDay(d.weekday || null)}
                  style={{ flex: d.weekday ? 1 : 1.4, height: 44, border: 0, borderRadius: 4, cursor: 'pointer', fontSize: 12, fontWeight: 700,
                    background: on ? 'var(--guante)' : 'var(--cuerda)', color: on ? 'var(--lona)' : 'var(--campana)' }}>{d.label}</button>
              );
            })}
          </div>
          <input type="hidden" name="day" value={day ?? ''} />
        </fieldset>
      )}
      {showExercise && exercises.length > 0 && (
        <label className="field">
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', color: 'var(--guante)' }}>Ejercicio</span>
          <select className="input" name="exercise" defaultValue="">
            <option value="">Elegí uno (opcional)</option>
            {exercises.map((e) => <option key={e} value={e}>{e}</option>)}
          </select>
        </label>
      )}
    </>
  );
}
