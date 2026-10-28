import BackBar from '@/components/BackBar';
import { requireUser } from '@/lib/auth';
import { challenge, monthCount, news, raffle } from '@/lib/data';
import { corta, dia2, mesCorto } from '@/lib/dates';
import { joinRaffle } from '../perfil/actions';

export default async function Comunidad() {
  const u = await requireUser();
  const [reto, hechas, sorteo, novedades] = await Promise.all([challenge(), monthCount(u.id), raffle(u.id), news(10)]);
  const faltan = reto ? Math.max(0, reto.target - hechas) : 0;
  return (
    <main className="page tight">
      <BackBar href="/" label="Volver a Inicio" />
      <h1 className="title-lg">En el gym</h1>

      {reto && (
        <section aria-label="Reto del mes" className="card bg-violeta" style={{ padding: 18 }}>
          <span className="label">Reto del mes</span>
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{reto.title}</span>
          {reto.description && <span className="caption">{reto.description}</span>}
          <div style={{ display: 'flex', gap: 3 }} aria-hidden="true">
            {Array.from({ length: reto.target }).map((_, i) => <span key={i} style={{ flex: 1, height: 6, borderRadius: 2, background: 'var(--on-violeta)', opacity: i < hechas ? 1 : 0.3 }} />)}
          </div>
          <span className="caption strong">{faltan === 0 ? '¡Reto cumplido!' : `${hechas} de ${reto.target} · te faltan ${faltan}`}</span>
        </section>
      )}

      {sorteo && (
        <section aria-label="Sorteo" className="card bg-esquina" style={{ padding: 18 }}>
          <span className="label" style={{ color: '#d69ae8' }}>Sorteo</span>
          <div className="row">
            <span style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 24, lineHeight: '26px', textTransform: 'uppercase' }}>{sorteo.title}</span>
              <span className="caption" style={{ color: '#bdbdbd' }}>{sorteo.joined ? 'Ya estás participando · ' : ''}Cierra el {corta(sorteo.closes_on)} · {sorteo.n} {sorteo.n === 1 ? 'anotado' : 'anotados'}</span>
            </span>
            <form action={joinRaffle}>
              <input type="hidden" name="id" value={sorteo.id} />
              {sorteo.joined && <input type="hidden" name="leave" value="1" />}
              <button style={{ minHeight: 40, padding: '0 12px', border: 0, borderRadius: 4, cursor: 'pointer', fontFamily: 'var(--font-archivo)', fontWeight: 800, fontSize: 13, letterSpacing: '0.06em',
                background: sorteo.joined ? 'transparent' : '#f5f5f5', color: sorteo.joined ? '#f5f5f5' : '#111', boxShadow: sorteo.joined ? 'inset 0 0 0 1.5px #f5f5f5' : 'none' }}>
                {sorteo.joined ? 'ANOTADA' : 'PARTICIPAR'}
              </button>
            </form>
          </div>
        </section>
      )}

      <section style={{ paddingTop: 6 }}>
        <h2 className="label" style={{ paddingBottom: 8 }}>Novedades</h2>
        {novedades.map((n) => (
          <div key={n.id} style={{ display: 'flex', gap: 14, padding: '12px 0', borderTop: '1px solid var(--linea)' }}>
            <span style={{ width: 40, flexShrink: 0, display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 20 }}>{dia2(n.date)}</span>
              <span className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.06em' }}>{mesCorto(n.date)}</span>
            </span>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span className="strong" style={n.birthday ? { color: 'var(--violeta-texto)' } : undefined}>{n.title}</span>
              {n.body && <span className="caption muted">{n.body}</span>}
            </span>
          </div>
        ))}
      </section>
    </main>
  );
}
