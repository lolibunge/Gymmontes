import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import BackBar from '@/components/BackBar';
import { requireOwner } from '@/lib/admin';
import { one } from '@/lib/db';
import { videoFor } from '@/lib/video';
import { saveExercise } from '../../actions';
import PrintButton from './PrintButton';

const ERR: Record<string, string> = {
  nombre: 'El ejercicio necesita un nombre.',
  codigo: 'Ese código ya lo tiene otra máquina.',
  video: 'El link del video tiene que empezar con https://',
};

export default async function EditarEjercicio({ params, searchParams }: { params: { id: string }; searchParams: { guardado?: string; error?: string } }) {
  await requireOwner();
  const ex = await one<{ id: number; name: string; slug: string; muscle: string | null; machine_code: string | null; steps: string[]; video_url: string | null }>(
    'select id, name, slug, muscle, machine_code, steps, video_url from exercises where id = $1', [Number(params.id)]);
  if (!ex) notFound();
  const next = await one<{ c: string }>(`select 'M' || lpad((coalesce(max(substring(machine_code from '\\d+')::int), 0) + 1)::text, 2, '0') as c from exercises where machine_code ~ '^M\\d+$'`);
  const h = headers();
  const origin = process.env.APP_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host')}`;
  const qrUrl = ex.machine_code ? `${origin}/m/${ex.machine_code}` : null;
  const svg = qrUrl ? await QRCode.toString(qrUrl, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }) : null;
  const video = videoFor(ex.video_url);

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="no-print"><BackBar href="/admin/gym?tab=maquinas" label="Volver a Máquinas" right={searchParams.guardado ? <span className="strong brand" style={{ fontSize: 14 }}>Guardado</span> : null} /></div>
      <h1 className="title no-print">{ex.name}</h1>
      {searchParams.error && ERR[searchParams.error] && <p role="alert" className="caption no-print" style={{ color: 'var(--alerta)', fontWeight: 600 }}>{ERR[searchParams.error]}</p>}

      <form action={saveExercise} className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <input type="hidden" name="id" value={ex.id} />
        <label className="field"><span>Nombre</span><input className="input" name="name" defaultValue={ex.name} required /></label>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 110px', gap: 10 }}>
          <label className="field"><span>Músculo / zona</span><input className="input" name="muscle" defaultValue={ex.muscle ?? ''} placeholder="Piernas · cuádriceps" /></label>
          <label className="field"><span>Máquina</span><input className="input" name="machine_code" defaultValue={ex.machine_code ?? ''} placeholder={next?.c ?? 'M01'} /></label>
        </div>
        <label className="field"><span>Cómo se hace (un paso por renglón)</span>
          <textarea className="input" name="steps" rows={6} defaultValue={ex.steps.join('\n')}
            placeholder={'Apoyá la espalda entera en el respaldo.\nPies a la altura de los hombros.\nBajá controlando hasta 90°.\nSubí empujando con los talones.'} />
        </label>
        <label className="field"><span>Video (link)</span>
          <input className="input" name="video_url" inputMode="url" defaultValue={ex.video_url ?? ''} placeholder="https://youtu.be/…" />
        </label>
        <p className="caption muted" style={{ marginTop: -6 }}>
          Lo más simple: subí el video a YouTube como <b>"No listado"</b> y pegá el link; se ve dentro de la app. También sirve un link de Instagram o Google Drive (se abre aparte).
          {video && <> Ahora: <b>{video.kind === 'youtube' ? 'YouTube, se ve en la app' : video.kind === 'file' ? 'video, se ve en la app' : `link a ${video.host}`}</b>.</>}
        </p>
        <button className="btn btn-primary" style={{ justifyContent: 'center' }}>Guardar</button>
      </form>

      <section className="card print-sticker" style={{ boxShadow: 'inset 0 0 0 1.5px var(--linea)', gap: 10, alignItems: 'center', textAlign: 'center' }}>
        <h2 className="label no-print" style={{ alignSelf: 'flex-start' }}>Sticker QR</h2>
        {svg ? (
          <>
            <div style={{ width: 200, height: 200, background: '#fff', padding: 8, borderRadius: 4 }} dangerouslySetInnerHTML={{ __html: svg }} />
            <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 22 }}>GYM MONTES · MÁQUINA {ex.machine_code!.replace(/^M/, '')}</span>
            <span className="strong">{ex.name}</span>
            <span className="caption muted">Escaneá con la cámara y mirá cómo se usa</span>
            <div className="no-print" style={{ alignSelf: 'stretch', display: 'flex', flexDirection: 'column' }}><PrintButton /></div>
          </>
        ) : (
          <p className="caption muted">Poné un código de máquina (por ejemplo {next?.c ?? 'M01'}) y guardá para generar el QR que se pega en la máquina.</p>
        )}
      </section>
    </main>
  );
}
