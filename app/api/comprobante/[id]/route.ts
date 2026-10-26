import { currentUser } from '@/lib/auth';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

/** Comprobante de un pago informado. Solo lo ve la dueña. */
export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const u = await currentUser();
  if (!u || u.role !== 'duena') return new Response('No autorizado', { status: 403 });
  const r = await one<{ receipt: Buffer | null; receipt_type: string | null }>('select receipt, receipt_type from payment_reports where id = $1', [Number(params.id)]);
  if (!r?.receipt) return new Response('Sin comprobante', { status: 404 });
  return new Response(new Uint8Array(r.receipt), { headers: { 'Content-Type': r.receipt_type || 'application/octet-stream', 'Cache-Control': 'private, no-store' } });
}
