import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import { addInjury, saveGoals } from '../actions';

export default async function Objetivos() {
  const u = await requireUser();
  const injuries = await q<{ id: number; title: string; status: string; notes: string | null }>('select id, title, status, notes from injuries where user_id = $1 order by id', [u.id]);
  const badge = (s: string) => (s.toLowerCase().includes('pendiente') || s.toLowerCase().includes('activa') ? 'bg-alerta' : 'bg-venda brand');
  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Volver a Perfil" />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title">Objetivos y lesiones</h1>
        <p className="caption muted" style={{ fontSize: 14 }}>Tu entrenadora ve esto cuando arma tu rutina.</p>
      </div>
      <form action={saveGoals} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 className="label">Objetivos</h2>
        {u.goal_tags.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {u.goal_tags.map((t) => <span key={t} className="badge" style={{ background: 'var(--guante)', color: 'var(--lona)', fontSize: 13, padding: '8px 12px' }}>{t}</span>)}
          </div>
        )}
        <label className="field"><span className="sr">Tus objetivos</span><textarea className="input" name="goals" rows={6} defaultValue={u.goals_text ?? ''} placeholder="¿Qué querés lograr?" /></label>
        <button className="link" style={{ alignSelf: 'flex-start' }}>Guardar objetivos</button>
      </form>
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 6 }}>
        <h2 className="label">Lesiones y cuidados</h2>
        {injuries.map((i) => (
          <article key={i.id} className="card" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 8 }}>
            <div className="row"><span className="strong">{i.title}</span><span className={`badge ${badge(i.status)}`}>{i.status}</span></div>
            {i.notes && <span className="caption muted">{i.notes}</span>}
          </article>
        ))}
        <details>
          <summary className="btn btn-outline" style={{ listStyle: 'none', fontSize: 14 }}>Agregar lesión o molestia</summary>
          <form action={addInjury} style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 12 }}>
            <label className="field"><span>Qué te pasa</span><input className="input" name="title" required placeholder="Ej.: molestia en la rodilla" /></label>
            <label className="field"><span>Detalle o indicación médica</span><textarea className="input" name="notes" rows={3} /></label>
            <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar</button>
          </form>
        </details>
      </section>
    </main>
  );
}
