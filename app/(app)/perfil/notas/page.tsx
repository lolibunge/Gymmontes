import { requireUser } from '@/lib/auth';
import { q } from '@/lib/db';
import BackBar from '@/components/BackBar';
import NoteForm from './NoteForm';

export const dynamic = 'force-dynamic';

const fecha = (iso: string) => new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' });

export default async function Notas() {
  const user = await requireUser();
  const notas = await q<{ id: number; body: string; context: string | null; status: string; created_at: string }>(
    `select id, body, context, status, created_at::text from notes where user_id = $1 order by created_at desc limit 50`, [user.id]
  );
  return (
    <main className="page tight">
      <BackBar href="/perfil" label="Perfil" />
      <h1 className="title">Notas de prueba</h1>
      <p className="caption muted">Estamos probando la app este mes. Anotá todo lo que falle, no se entienda o mejorarías: le llega a la entrenadora. También podés escribir una nota durante la sesión, con el ícono de la hoja arriba.</p>
      <NoteForm />
      <section>
        {notas.map((n) => (
          <div key={n.id} className="list-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
            <span className="caption muted">{fecha(n.created_at)}{n.context ? ` · ${n.context}` : ''} · {n.status === 'resuelta' ? '✓ resuelta' : n.status === 'vista' ? 'vista' : 'enviada'}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{n.body}</span>
          </div>
        ))}
      </section>
    </main>
  );
}
