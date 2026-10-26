import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin';
import { one } from '@/lib/db';
import { routineDays } from '@/lib/data';
import { DIAS } from '@/lib/dates';
import BackBar from '@/components/BackBar';
import { saveEdits } from '../../../actions';

export default async function Editar({ params }: { params: { id: string } }) {
  await requireOwner();
  const id = Number(params.id);
  const u = await one<{ name: string }>('select name from users where id = $1', [id]);
  if (!u) notFound();
  const days = await routineDays(id);
  const cell: React.CSSProperties = { height: 40, padding: '0 8px', fontSize: 14, width: '100%' };
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <BackBar href={`/admin/socios/${id}`} label={`Volver a ${u.name}`} />
      <h1 className="title">Editar rutina de {u.name}</h1>
      <p className="caption muted">Cambiá series, reps o peso, y marcá ▲ cuando le toca subir peso. Para cambiar ejercicios, subí una planilla nueva.</p>
      <form action={saveEdits} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <input type="hidden" name="user" value={id} />
        {days.map((d) => (
          <section key={d.id}>
            <h2 className="label" style={{ paddingBottom: 6 }}>{DIAS[d.weekday]} · {d.subtitle}</h2>
            {d.items.filter((i) => i.kind === 'ejercicio').map((i) => (
              <div key={i.id} style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 56px 84px 70px 44px', gap: 6, alignItems: 'center', padding: '6px 0', borderTop: '1px solid var(--linea)' }}>
                <input type="hidden" name="item" value={i.id} />
                <input type="hidden" name={`note_${i.id}`} value={i.note ?? ''} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>{i.name}</span>
                <label><span className="sr">Series de {i.name}</span><input className="input" style={cell} name={`sets_${i.id}`} inputMode="numeric" defaultValue={i.sets ?? ''} /></label>
                <label><span className="sr">Reps de {i.name}</span><input className="input" style={cell} name={`reps_${i.id}`} defaultValue={i.reps ?? ''} /></label>
                <label><span className="sr">Peso de {i.name}</span><input className="input" style={cell} name={`kg_${i.id}`} inputMode="decimal" defaultValue={i.weight_kg ? Number(i.weight_kg) : ''} placeholder="kg" /></label>
                <label title="Le toca subir peso" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13 }} className="brand">
                  <input type="checkbox" name={`raise_${i.id}`} defaultChecked={i.raise_weight} aria-label={`${i.name}: le toca subir peso`} />▲
                </label>
              </div>
            ))}
          </section>
        ))}
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar cambios</button>
      </form>
    </main>
  );
}
