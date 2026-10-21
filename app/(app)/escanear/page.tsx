import { q } from '@/lib/db';
import Scanner from './Scanner';

export default async function Escanear() {
  const machines = await q<{ code: string; name: string }>('select machine_code as code, name from exercises where machine_code is not null order by machine_code');
  return (
    <main className="page">
      <h1 className="title-lg">Escaneá la máquina</h1>
      <p className="muted">Apuntá la cámara al QR pegado en el aparato para ver cómo se usa.</p>
      <Scanner machines={machines} />
    </main>
  );
}
