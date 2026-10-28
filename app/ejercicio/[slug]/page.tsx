import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one, q } from '@/lib/db';
import { DIAS } from '@/lib/dates';
import CloseButton from '@/components/CloseButton';
import { weightLabel } from '@/lib/data';
import { videoFor } from '@/lib/video';

export const dynamic = 'force-dynamic';

export default async function Ficha({ params, searchParams }: { params: { slug: string }; searchParams: { volver?: string } }) {
  const user = await requireUser();
  const ex = await one<{ id: number; name: string; muscle: string | null; machine_code: string | null; steps: string[]; video_url: string | null }>(
    'select id, name, muscle, machine_code, steps, video_url from exercises where slug = $1',
    [params.slug]
  );
  if (!ex) notFound();
  const video = videoFor(ex.video_url);
  const enRutina = await q<{ weekday: number; sets: number | null; reps: string | null; weight_kg: string | null }>(
    `select d.weekday, i.sets, i.reps, i.weight_kg::text as weight_kg from day_items i
       join routine_days d on d.id = i.day_id join routines r on r.id = d.routine_id
      where r.user_id = $1 and r.active and i.exercise_id = $2 order by d.weekday`,
    [user.id, ex.id]
  );
  return (
    <div className="app">
      <section style={{ minHeight: 340, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 'calc(20px + env(safe-area-inset-top)) 24px 24px', background: '#111', color: '#f5f5f5' }}>
        <div className="row">
          {ex.machine_code ? (
            <span style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 4, boxShadow: 'inset 0 0 0 1px #3a3a3a', fontSize: 11, fontWeight: 600, letterSpacing: '0.08em' }}>
              MÁQUINA {ex.machine_code.replace('M', '')}
            </span>
          ) : <span />}
          <CloseButton volver={searchParams.volver} style={{ background: '#2a2a2a', color: '#f5f5f5' }} />
        </div>
        {video?.kind === 'youtube' ? (
          <iframe src={video.src} title={`Video: ${ex.name}`} allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowFullScreen
            style={video.vertical
              ? { width: 'min(100%, 300px)', aspectRatio: '9 / 16', alignSelf: 'center', border: 0, borderRadius: 8, margin: '16px 0' }
              : { width: '100%', aspectRatio: '16 / 9', border: 0, borderRadius: 4, margin: '16px 0' }} />
        ) : video?.kind === 'file' ? (
          <video src={video.src} controls playsInline style={{ width: '100%', borderRadius: 4, margin: '16px 0' }} />
        ) : video?.kind === 'link' ? (
          <a href={video.src} target="_blank" rel="noopener" className="btn btn-primary" style={{ margin: '24px 0', justifyContent: 'center' }}>{video.src.includes('/results?') ? 'Ver videos de cómo se hace' : `Ver el video en ${video.host}`} ▶</a>
        ) : (
          <p style={{ alignSelf: 'center', textAlign: 'center', fontSize: 13, color: '#bdbdbd', padding: '24px 0' }}>Acá va el video de la máquina<br />(lo sube la entrenadora)</p>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {ex.muscle && <span className="label" style={{ color: '#d69ae8' }}>{ex.muscle}</span>}
          <h1 className="title-lg" style={{ fontSize: ex.name.length > 16 ? 36 : 56, lineHeight: 1 }}>{ex.name}</h1>
        </div>
      </section>
      <main className="page tight" style={{ paddingBottom: 40 }}>
        <section>
          <h2 className="label" style={{ paddingBottom: 4 }}>Cómo se hace</h2>
          {ex.steps.length ? (
            <ol style={{ margin: 0, padding: 0, listStyle: 'none' }}>
              {ex.steps.map((s, k) => (
                <li key={k} style={{ display: 'flex', gap: 16, padding: '11px 0', borderBottom: k < ex.steps.length - 1 ? '1px solid var(--linea)' : 0 }}>
                  <span className="brand" style={{ width: 20, flexShrink: 0, fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 18 }}>{k + 1}</span>{s}
                </li>
              ))}
            </ol>
          ) : (
            <p className="muted" style={{ paddingTop: 8 }}>La entrenadora todavía no cargó los pasos de este ejercicio. Consultale en sala.</p>
          )}
        </section>
        {enRutina.map((r) => (
          <Link key={r.weekday} href={`/rutina?dia=${r.weekday}`} className="card bg-venda" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', color: 'var(--guante)' }}>
            <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '0.1em' }} className="brand">EN TU RUTINA · {DIAS[r.weekday].toUpperCase()}</span>
              <span className="strong">{r.sets} × {r.reps} · {weightLabel(r.weight_kg)}</span>
            </span>
            <span className="link">Ver día</span>
          </Link>
        ))}
      </main>
    </div>
  );
}
