import Link from 'next/link';
import { requireOwner } from '@/lib/admin';
import { q } from '@/lib/db';
import { markNote } from '@/lib/notes';

export const dynamic = 'force-dynamic';

const fecha = (iso: string) => new Date(iso).toLocaleString('es-UY', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Montevideo' });

export default async function NotasAdmin({ searchParams }: { searchParams: { f?: string } }) {
  await requireOwner();
  const f = searchParams.f === 'todas' ? 'todas' : 'abiertas';
  const notas = await q<{ id: number; body: string; context: string | null; status: string; created_at: string; name: string; user_id: number }>(
    `select n.id, n.body, n.context, n.status, n.created_at::text, u.name, u.id as user_id
       from notes n join users u on u.id = n.user_id
      ${f === 'abiertas' ? `where n.status <> 'resuelta'` : ''}
      order by n.created_at desc limit 200`
  );
  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <h1 className="title">Notas de prueba</h1>
      <p className="caption muted">Lo que los socios anotan mientras prueban la app: errores, dudas e ideas. Marcalas como vistas o resueltas.</p>
      <div role="group" aria-label="Filtro" style={{ display: 'flex', gap: 8 }}>
        <Link href="/admin/notas" className="chip" aria-pressed={f === 'abiertas'} style={{ display: 'flex', alignItems: 'center' }}>Abiertas</Link>
        <Link href="/admin/notas?f=todas" className="chip" aria-pressed={f === 'todas'} style={{ display: 'flex', alignItems: 'center' }}>Todas</Link>
      </div>
      {notas.length === 0 && <p className="caption muted">No hay notas {f === 'abiertas' ? 'abiertas' : 'todavía'}.</p>}
      {notas.map((n) => (
        <article key={n.id} className={`card ${n.status === 'nueva' ? 'bg-venda' : 'bg-cuerda'}`}>
          <div className="row" style={{ alignItems: 'baseline' }}>
            <Link href={`/admin/socios/${n.user_id}`} className="strong" style={{ color: 'var(--guante)' }}>{n.name}</Link>
            <span className="caption muted">{fecha(n.created_at)}</span>
          </div>
          {n.context && <span className="caption brand strong">{n.context}</span>}
          <p style={{ whiteSpace: 'pre-wrap' }}>{n.body}</p>
          <form action={markNote} style={{ display: 'flex', gap: 8 }}>
            <input type="hidden" name="id" value={n.id} />
            {n.status !== 'vista' && <button name="status" value="vista" className="chip" style={{ flex: 1 }}>Vista</button>}
            {n.status !== 'resuelta' && <button name="status" value="resuelta" className="chip" style={{ flex: 1 }}>Resuelta ✓</button>}
            {n.status === 'resuelta' && <button name="status" value="nueva" className="chip" style={{ flex: 1 }}>Reabrir</button>}
          </form>
        </article>
      ))}
    </main>
  );
}
