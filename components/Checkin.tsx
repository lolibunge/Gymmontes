'use client';
import { useState } from 'react';
import { ENERGY, SLEEP, rpeLabel, signalsFor, type Checkin, type Hormonal } from '@/lib/checkin';

const chip = (on: boolean): React.CSSProperties => ({
  minHeight: 38, padding: '0 12px', border: 0, borderRadius: 999, cursor: 'pointer', fontSize: 13, fontWeight: 600,
  background: on ? 'var(--violeta)' : 'var(--cuerda)', color: on ? 'var(--on-violeta)' : 'var(--guante)',
});

/** "¿Cómo llegás hoy?": al empezar la sesión. Todo opcional; se puede saltear. */
export function CheckinStart({ value, hormonal, onSave, onSkip }: { value: Checkin; hormonal: Hormonal; onSave: (c: Checkin) => void; onSkip: () => void }) {
  const [c, setC] = useState<Checkin>(value);
  const toggle = (s: string) => setC((x) => ({ ...x, signals: x.signals.includes(s) ? x.signals.filter((y) => y !== s) : [...x.signals, s] }));
  return (
    <div className="sheet-bg" onClick={onSkip}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Cómo llegás hoy" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '92dvh', overflowY: 'auto' }}>
        <div className="row">
          <span className="label brand">¿Cómo llegás hoy?</span>
          <button type="button" className="link" onClick={onSkip}>Saltear</button>
        </div>
        <p className="caption muted">Es solo para vos: te ayuda a entender los días en que rendís más o menos. Nadie más lo ve.</p>

        <span className="caption strong">Energía</span>
        <div role="group" aria-label="Energía" style={{ display: 'flex', gap: 6 }}>
          {ENERGY.map((e) => {
            const on = c.energy === e.v;
            return (
              <button key={e.v} type="button" aria-pressed={on} aria-label={e.label} onClick={() => setC({ ...c, energy: on ? null : e.v })}
                style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 0', border: 0, borderRadius: 8, cursor: 'pointer',
                  background: on ? 'var(--venda)' : 'var(--cuerda)', boxShadow: on ? 'inset 0 0 0 2px var(--violeta)' : 'none', color: 'var(--guante)' }}>
                <span style={{ fontSize: 26, lineHeight: 1 }}>{e.face}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{e.label}</span>
              </button>
            );
          })}
        </div>

        <span className="caption strong">¿Cómo dormiste?</span>
        <div role="group" aria-label="Sueño" style={{ display: 'flex', gap: 6 }}>
          {SLEEP.map((s) => <button key={s.v} type="button" aria-pressed={c.sleep === s.v} onClick={() => setC({ ...c, sleep: c.sleep === s.v ? null : s.v })} style={{ ...chip(c.sleep === s.v), flex: 1 }}>{s.label}</button>)}
        </div>

        {hormonal === 'ciclo' && (
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, padding: '4px 0' }}>
            <input type="checkbox" checked={!!c.period} onChange={(e) => setC({ ...c, period: e.target.checked })} style={{ width: 20, height: 20, accentColor: 'var(--violeta)' }} />
            Estoy con el período
          </label>
        )}

        <span className="caption strong">Señales del cuerpo</span>
        <div role="group" aria-label="Señales del cuerpo" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {signalsFor(hormonal).map((s) => <button key={s} type="button" aria-pressed={c.signals.includes(s)} onClick={() => toggle(s)} style={chip(c.signals.includes(s))}>{s}</button>)}
        </div>

        <textarea className="input" rows={2} value={c.note ?? ''} onChange={(e) => setC({ ...c, note: e.target.value })} placeholder="Una nota, si querés (ej.: dormí 5 horas)" />
        <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} onClick={() => onSave(c)}>Listo, a entrenar</button>
      </div>
    </div>
  );
}

/** "¿Cómo te sentiste?": al terminar. Esfuerzo del 1 al 10 y una nota. */
export function CheckinEnd({ value, busy, onSave, onSkip }: { value: Checkin; busy: boolean; onSave: (c: Checkin) => void; onSkip: () => void }) {
  const [c, setC] = useState<Checkin>(value);
  return (
    <div className="sheet-bg" onClick={busy ? undefined : onSkip}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label="Cómo te sentiste" onClick={(e) => e.stopPropagation()}>
        <span className="label brand">¿Cómo te sentiste?</span>
        <span className="caption strong">Esfuerzo de la sesión {c.rpe ? `· ${c.rpe} · ${rpeLabel(c.rpe)}` : ''}</span>
        <div role="group" aria-label="Esfuerzo del 1 al 10" style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: 4 }}>
          {Array.from({ length: 10 }, (_, k) => k + 1).map((n) => {
            const on = c.rpe === n;
            return (
              <button key={n} type="button" aria-pressed={on} onClick={() => setC({ ...c, rpe: on ? null : n })}
                style={{ height: 40, border: 0, borderRadius: 6, cursor: 'pointer', fontWeight: 800, fontFamily: 'var(--font-archivo)',
                  background: on ? 'var(--violeta)' : 'var(--cuerda)', color: on ? 'var(--on-violeta)' : 'var(--guante)' }}>{n}</button>
            );
          })}
        </div>
        <div className="row caption muted" style={{ fontSize: 11 }}><span>Fácil</span><span>Al máximo</span></div>
        <textarea className="input" rows={3} value={c.after_note ?? ''} onChange={(e) => setC({ ...c, after_note: e.target.value })}
          placeholder="¿Algo para recordar? (ej.: no tenía fuerza, todo pesaba el doble)" />
        <button type="button" className="btn btn-primary" style={{ justifyContent: 'center' }} disabled={busy} onClick={() => onSave(c)}>{busy ? 'Guardando…' : 'Guardar y terminar'}</button>
        <button type="button" className="link" style={{ alignSelf: 'center' }} disabled={busy} onClick={onSkip}>Terminar sin completar</button>
      </div>
    </div>
  );
}
