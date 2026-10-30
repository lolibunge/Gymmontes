import { notFound } from 'next/navigation';
import { requireOwner } from '@/lib/admin';
import { one } from '@/lib/db';
import BackBar from '@/components/BackBar';
import Importer from './Importer';

export default async function SubirRutina({ params }: { params: { id: string } }) {
  await requireOwner();
  const id = Number(params.id);
  const u = await one<{ name: string; goals_text: string | null }>('select name, goals_text from users where id = $1', [id]);
  if (!u) notFound();
  const req = await one<{ goals: string[]; days: number | null; notes: string | null }>(
    `select goals, days, notes from routine_requests where user_id = $1 order by id desc limit 1`, [id]);
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <BackBar href={`/admin/socios/${id}`} label={`Volver a ${u.name}`} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <h1 className="title">Rutina para {u.name}</h1>
        {req && <p className="caption muted">Pidió: {req.goals.join(', ') || '—'} · {req.days ?? '—'} días por semana{req.notes ? ` · ${req.notes}` : ''}</p>}
      </div>
      <section className="card bg-cuerda" style={{ gap: 8 }}>
        <span className="strong">1. Usá la rutina como la armás siempre</span>
        <span className="caption"><b>Lo más fácil: subí el PDF</b> de “Planificación de entrenamiento” tal como se lo mandás al socio. Leemos los días, ejercicios, series, repeticiones, notas y la bici por tramos. El PDF no trae pesos: los anota el socio en su primera sesión.</span>
        <span className="caption">Sirve la planilla de la entrenadora tal cual: cada día (<b>01 · LUNES</b>), la fila <b>EJERCICIO · SERIES · REPETICIONES · PESO (KG)</b> y debajo los ejercicios. El cardio (<i>BICICLETA · 26 MIN</i>) con sus tramos en la fila de abajo, y <b>▲ Subir peso</b> se marca solo. Si la planilla tiene varias pestañas, abrí la de la rutina y copiá ese link.</span>
        <span className="caption muted">O usá la plantilla simple, con columnas <b>Día · Enfoque · Ejercicio · Series · Reps · Peso · Notas · Tramos</b>. Una fila por ejercicio. Para el cardio, completá <b>Tramos</b> con minutos y ritmo, por ejemplo <i>5 Suave; 20 Moderado; 3 Suave</i>.</span>
        <a href="/plantilla-rutina.csv" download className="link" style={{ alignSelf: 'flex-start' }}>Descargar plantilla de ejemplo (CSV)</a>
      </section>
      <Importer userId={id} defaultTitle={req?.days ? `Rutina ${req.days} días` : 'Rutina'} defaultObjective={u.goals_text ?? ''} />
    </main>
  );
}
