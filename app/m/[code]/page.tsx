import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { one, q } from '@/lib/db';
import { currentUser } from '@/lib/auth';
import { Chevron, Close } from '@/components/Icons';

export const dynamic = 'force-dynamic';

// El sticker QR de cada máquina apunta a /m/<código>, por ejemplo /m/M07.
// Si en la máquina se hace un solo ejercicio, abre su ficha; si son varios, deja elegir.
export default async function Maquina({ params }: { params: { code: string } }) {
  if (!(await currentUser())) redirect(`/login?next=${encodeURIComponent(`/m/${params.code}`)}`);
  const code = params.code.toUpperCase();
  const exs = await q<{ slug: string; name: string; muscle: string | null }>(
    'select slug, name, muscle from exercises where upper(machine_code) = $1 order by name', [code]);
  if (!exs.length) notFound();
  if (exs.length === 1) redirect(`/ejercicio/${exs[0].slug}`);
  const m = await one<{ name: string | null }>('select name from machines where code = $1', [code]);
  return (
    <div className="app">
      <main className="page">
        <div className="row">
          <span className="badge" style={{ boxShadow: 'inset 0 0 0 1px var(--linea)', letterSpacing: '0.08em' }}>MÁQUINA {code.replace(/^M/, '')}</span>
          <Link href="/" className="icon-btn" aria-label="Cerrar" style={{ background: 'var(--cuerda)' }}><Close /></Link>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <h1 className="title-lg">{m?.name ?? 'Esta máquina'}</h1>
          <p className="muted">Acá se hacen {exs.length} ejercicios. Elegí el tuyo para ver cómo se hace.</p>
        </div>
        <section>
          {exs.map((e) => (
            <Link key={e.slug} href={`/ejercicio/${e.slug}`} className="list-row">
              <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span className="strong">{e.name}</span>
                {e.muscle && <span className="caption muted">{e.muscle}</span>}
              </span>
              <Chevron />
            </Link>
          ))}
        </section>
      </main>
    </div>
  );
}
