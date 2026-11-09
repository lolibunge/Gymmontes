import Link from 'next/link';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import BackBar from '@/components/BackBar';
import { requireOwner } from '@/lib/admin';
import { one, q } from '@/lib/db';
import PrintButton from './PrintButton';

// Plancha con el sticker QR de cada máquina, para imprimir todos juntos.
// ?ver=nuevas muestra solo las máquinas que se sumaron en v1.23.
export default async function PlanchaQR({ searchParams }: { searchParams: { ver?: string } }) {
  await requireOwner();
  const nuevas = (await one<{ value: string }>(`select value from gym_settings where key = 'maquinas_nuevas_v1'`))?.value
    .split(',').filter(Boolean) ?? [];
  const soloNuevas = searchParams.ver === 'nuevas' && nuevas.length > 0;
  const rows = await q<{ code: string; name: string | null; exs: string[] }>(
    `select e.machine_code as code, max(m.name) as name, array_agg(e.name order by e.name) as exs
       from exercises e left join machines m on m.code = e.machine_code
      where e.machine_code is not null group by e.machine_code
      order by coalesce(substring(e.machine_code from '\\d+')::int, 0), e.machine_code`);
  const list = soloNuevas ? rows.filter((r) => nuevas.includes(r.code)) : rows;
  const h = headers();
  const origin = process.env.APP_URL?.replace(/\/$/, '') || `${h.get('x-forwarded-proto') || 'https'}://${h.get('x-forwarded-host') || h.get('host')}`;
  const stickers = await Promise.all(list.map(async (r) => ({
    ...r, svg: await QRCode.toString(`${origin}/m/${r.code}`, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' }),
  })));

  return (
    <main style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="no-print"><BackBar href="/admin/gym?tab=maquinas" label="Volver a Máquinas" /></div>
      <div className="no-print" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <h1 className="title">Plancha de QRs</h1>
        <p className="caption muted">Un sticker por máquina. Al escanearlo se ven todos los ejercicios que se hacen en ella, con los pasos, los músculos y el video.</p>
        {nuevas.length > 0 && (
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/admin/qr?ver=nuevas" className="badge" style={{ background: soloNuevas ? 'var(--guante)' : 'var(--cuerda)', color: soloNuevas ? 'var(--lona)' : 'var(--guante)', fontWeight: 600 }}>Solo las nuevas ({nuevas.length})</Link>
            <Link href="/admin/qr" className="badge" style={{ background: !soloNuevas ? 'var(--guante)' : 'var(--cuerda)', color: !soloNuevas ? 'var(--lona)' : 'var(--guante)', fontWeight: 600 }}>Todas ({rows.length})</Link>
          </div>
        )}
        <PrintButton />
      </div>
      <div className="qr-sheet">
        {stickers.map((s) => (
          <section key={s.code} className="qr-sticker">
            <div style={{ width: 150, height: 150, background: '#fff', padding: 6, borderRadius: 4 }} dangerouslySetInnerHTML={{ __html: s.svg }} />
            <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 900, fontSize: 16 }}>GYM MONTES · MÁQUINA {s.code.replace(/^M/, '')}</span>
            {s.name && <span className="strong" style={{ fontSize: 15 }}>{s.name}</span>}
            <span className="caption">{s.exs.length > 4 ? `${s.exs.length} ejercicios` : s.exs.join(' · ')}</span>
            <span className="caption muted" style={{ fontSize: 11 }}>Escaneá con la cámara y mirá cómo se usa</span>
          </section>
        ))}
      </div>
    </main>
  );
}
