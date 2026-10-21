import { notFound, redirect } from 'next/navigation';
import { one } from '@/lib/db';

// El sticker QR de cada máquina apunta a /m/<código>, por ejemplo /m/M07
export default async function Maquina({ params }: { params: { code: string } }) {
  const ex = await one<{ slug: string }>('select slug from exercises where upper(machine_code) = upper($1)', [params.code]);
  if (!ex) notFound();
  redirect(`/ejercicio/${ex.slug}`);
}
