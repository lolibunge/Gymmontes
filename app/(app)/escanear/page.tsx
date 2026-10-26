import { q } from '@/lib/db';
import Scanner from './Scanner';

export default async function Escanear() {
  // Una fila por máquina: su nombre, o los ejercicios que se hacen ahí
  const machines = await q<{ code: string; name: string }>(
    `select e.machine_code as code, coalesce(max(m.name), string_agg(e.name, ' · ' order by e.name)) as name
       from exercises e left join machines m on m.code = e.machine_code
      where e.machine_code is not null group by e.machine_code order by e.machine_code`);
  return (
    <main className="page">
      <h1 className="title-lg">Escaneá la máquina</h1>
      <p className="muted">Apuntá la cámara al QR pegado en el aparato para ver cómo se usa.</p>
      <Scanner machines={machines} />
    </main>
  );
}
