import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import { routineDays } from '@/lib/data';
import { DIAS } from '@/lib/dates';
import BackBar from '@/components/BackBar';
import { saveEdits } from '../../../actions';

export default async function Editar({ params }: { params: { id: string } }) {
  await requireOwner();
  const id = Number(params.id);
  const u = await one<{ name: string }>('select name from users where id = $1', [id]);
  if (!u) notFound();
  const [days, pedido, catalogo] = await Promise.all([
    routineDays(id),
    one<{ change: string | null; weekday: number | null; exercise: string | null; notes: string | null }>(
      `select change, weekday, exercise, notes from routine_requests where user_id = $1 and status = 'Enviado' and kind = 'ajuste' order by id desc limit 1`, [id]),
    q<{ name: string }>('select name from exercises order by name'),
  ]);
  const cell: React.CSSProperties = { height: 40, padding: '0 8px', fontSize: 14, width: '100%' };
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <BackBar href={`/admin/socios/${id}`} label={`Volver a ${u.name}`} />
      <h1 className="title">Editar rutina de {u.name}</h1>
      <p className="caption muted">Cambiá el ejercicio, series, reps o peso, marcá ▲ cuando le toca subir, quitá o agregá ejercicios. El historial del socio no se pierde.</p>
      {pedido && (
        <div className="card bg-venda" style={{ padding: '12px 14px', gap: 4 }}>
          <span className="label brand">Pidió un ajuste</span>
          <span className="strong" style={{ fontSize: 14 }}>{pedido.change ?? 'Ajuste'}{pedido.weekday ? ` · ${DIAS[pedido.weekday]}` : ''}{pedido.exercise ? ` · ${pedido.exercise}` : ''}</span>
          {pedido.notes && <span className="caption">{pedido.notes}</span>}
          <span className="caption muted">Al guardar, el pedido queda resuelto y lo ve en la app.</span>
        </div>
      )}
      <datalist id="ejercicios">{catalogo.map((e) => <option key={e.name} value={e.name} />)}</datalist>
      <form action={saveEdits} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        <input type="hidden" name="user" value={id} />
        {days.map((d) => (
          <section key={d.id}>
            <h2 className="label" style={{ paddingBottom: 6 }}>{DIAS[d.weekday]} · {d.subtitle}</h2>
            {d.items.filter((i) => i.kind === 'ejercicio').map((i) => (
              <div key={i.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderTop: '1px solid var(--linea)' }}>
                <input type="hidden" name="item" value={i.id} />
                <input type="hidden" name={`note_${i.id}`} value={i.note ?? ''} />
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <label style={{ flex: 1 }}><span className="sr">Ejercicio</span>
                    <input className="input" style={{ ...cell, fontWeight: 600 }} name={`name_${i.id}`} defaultValue={i.name} list="ejercicios" />
                  </label>
                  <label className="caption" style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--alerta)', whiteSpace: 'nowrap' }}>
                    <input type="checkbox" name={`remove_${i.id}`} aria-label={`Quitar ${i.name}`} /> Quitar
                  </label>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 44px', gap: 6, alignItems: 'center' }}>
                  <label><span className="sr">Series de {i.name}</span><input className="input" style={cell} name={`sets_${i.id}`} inputMode="numeric" defaultValue={i.sets ?? ''} placeholder="series" /></label>
                  <label><span className="sr">Reps de {i.name}</span><input className="input" style={cell} name={`reps_${i.id}`} defaultValue={i.reps ?? ''} placeholder="reps" /></label>
                  <label><span className="sr">Peso de {i.name}</span><input className="input" style={cell} name={`kg_${i.id}`} inputMode="decimal" defaultValue={i.weight_kg ? Number(i.weight_kg) : ''} placeholder="kg" /></label>
                  <label title="Le toca subir peso" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2, fontSize: 13 }} className="brand">
                    <input type="checkbox" name={`raise_${i.id}`} defaultChecked={i.raise_weight} aria-label={`${i.name}: le toca subir peso`} />▲
                  </label>
                </div>
              </div>
            ))}
            <input type="hidden" name="day" value={d.id} />
            <details style={{ borderTop: '1px solid var(--linea)', paddingTop: 8 }}>
              <summary className="link" style={{ cursor: 'pointer', fontSize: 13, listStyle: 'none' }}>＋ Agregar ejercicio a {DIAS[d.weekday].toLowerCase()}</summary>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, paddingTop: 8 }}>
                <input className="input" style={cell} name={`new_name_${d.id}`} placeholder="Nombre del ejercicio" list="ejercicios" />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 44px', gap: 6 }}>
                  <input className="input" style={cell} name={`new_sets_${d.id}`} inputMode="numeric" placeholder="series" />
                  <input className="input" style={cell} name={`new_reps_${d.id}`} placeholder="reps" />
                  <input className="input" style={cell} name={`new_kg_${d.id}`} inputMode="decimal" placeholder="kg" />
                </div>
              </div>
            </details>
          </section>
        ))}
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar cambios</button>
      </form>
    </main>
  );
}
