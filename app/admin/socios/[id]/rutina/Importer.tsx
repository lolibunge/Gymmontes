'use client';
import { useFormState, useFormStatus } from 'react-dom';
import { confirmImport, previewImport, type PreviewState } from '@/app/admin/actions';

const DIAS = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

function Btn({ children, primary = true }: { children: React.ReactNode; primary?: boolean }) {
  const { pending } = useFormStatus();
  return <button className={`btn ${primary ? 'btn-primary' : 'btn-outline'}`} disabled={pending} style={{ justifyContent: 'center' }}>{pending ? 'Un momento…' : children}</button>;
}

export default function Importer({ userId, defaultTitle, defaultObjective }: { userId: number; defaultTitle: string; defaultObjective: string }) {
  const [state, action] = useFormState<PreviewState, FormData>(previewImport, {});
  return (
    <>
      <form action={action} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 14 }}>
        <span className="strong">2. Subí el archivo o pegá el link</span>
        <label className="field"><span>Link de Google Sheets</span>
          <input className="input" name="link" type="url" placeholder="https://docs.google.com/spreadsheets/d/…" />
        </label>
        <span className="caption muted">La planilla tiene que estar compartida como “Cualquier persona con el enlace · Lector”.</span>
        <label className="field"><span>O archivo CSV</span>
          <input name="file" type="file" accept=".csv,text/csv,text/plain" style={{ fontSize: 14 }} />
        </label>
        {state.error && <p role="alert" style={{ color: 'var(--alerta)', fontWeight: 600, fontSize: 14 }}>{state.error}</p>}
        <Btn primary={!state.days}>Ver vista previa</Btn>
      </form>

      {state.days && (
        <form action={confirmImport} className="card" style={{ boxShadow: 'inset 0 0 0 2px var(--violeta)', gap: 14 }}>
          <input type="hidden" name="user" value={userId} />
          <input type="hidden" name="days" value={JSON.stringify(state.days)} />
          <span className="strong">3. Revisá y guardá</span>
          <span className="caption muted">Leímos {state.days.length} días y {state.days.reduce((a, d) => a + d.items.length, 0)} ejercicios{state.source ? ` de ${state.source}` : ''}.</span>
          {state.warnings && state.warnings.length > 0 && (
            <div className="bg-venda" style={{ borderRadius: 4, padding: '10px 12px', fontSize: 13 }}>
              <b>Para revisar:</b>
              <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>{state.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </div>
          )}
          {state.days.map((d) => (
            <div key={d.weekday} style={{ borderTop: '1px solid var(--linea)', paddingTop: 10 }}>
              <p className="strong">{DIAS[d.weekday]}{d.subtitle && <span className="muted" style={{ fontWeight: 400 }}> · {d.subtitle}</span>}</p>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 6 }}>
                <tbody>
                  {d.items.map((it, k) => (
                    <tr key={k} style={{ borderTop: k ? '1px solid var(--linea)' : 0 }}>
                      <td style={{ padding: '6px 0' }}>{it.name}{it.raise && <span className="brand strong"> ▲ subir</span>}{it.note && <span className="muted"> · {it.note}</span>}</td>
                      <td style={{ padding: '6px 0', textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>
                        {it.kind === 'cardio' ? `${(it.segments ?? []).reduce((a, s) => a + s.min, 0)}′ por tramos` : `${it.sets} × ${it.reps ?? '—'}`}
                      </td>
                      <td style={{ padding: '6px 0 6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }} className="muted">{it.weight != null ? `${it.weight} kg` : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.note && <p className="caption muted" style={{ fontStyle: 'italic', paddingTop: 4 }}>{d.note}</p>}
            </div>
          ))}
          <label className="field"><span>Nombre de la rutina</span><input className="input" name="title" defaultValue={defaultTitle} /></label>
          <label className="field"><span>Objetivo (lo ve el socio)</span><textarea className="input" name="objective" rows={3} defaultValue={defaultObjective} /></label>
          <span className="caption muted">Al guardar, reemplaza la rutina actual. Su historial de pesos no se borra.</span>
          <Btn>Guardar y enviar al socio →</Btn>
        </form>
      )}
    </>
  );
}
