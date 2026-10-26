import { one, q } from './db';

export type PaySettings = { fee: string; bank: string; mpLink: string; cash: boolean; cashNote: string };

const KEYS = ['pay_fee', 'pay_bank', 'pay_mp_link', 'pay_cash', 'pay_cash_note'];

/** Cómo se cobra la cuota: lo carga la dueña en Gym → Cobros. */
export async function paySettings(): Promise<PaySettings> {
  const rows = await q<{ key: string; value: string | null }>('select key, value from gym_settings where key = any($1)', [KEYS]);
  const v = (k: string) => rows.find((r) => r.key === k)?.value ?? '';
  return { fee: v('pay_fee'), bank: v('pay_bank'), mpLink: v('pay_mp_link'), cash: v('pay_cash') !== 'no', cashNote: v('pay_cash_note') };
}

export async function setSetting(key: string, value: string | null) {
  await q('insert into gym_settings (key, value) values ($1,$2) on conflict (key) do update set value = excluded.value', [key, value]);
}

export type PayReport = { id: number; user_id: number; name: string; method: string; paid_on: string; note: string | null; has_receipt: boolean; status: string; created_at: Date };

export async function pendingPayments(userId?: number) {
  return q<PayReport>(
    `select p.id, p.user_id, u.name, p.method, to_char(p.paid_on,'YYYY-MM-DD') as paid_on, p.note, p.receipt is not null as has_receipt, p.status, p.created_at
       from payment_reports p join users u on u.id = p.user_id
      where p.status = 'pendiente' and ($1::int is null or p.user_id = $1)
      order by p.created_at`,
    [userId ?? null]
  );
}

/**
 * Registra 30 días de cuota. Si paga antes de que venza, el mes nuevo arranca
 * cuando termina el actual (no pierde días); si ya venció, arranca el día que pagó.
 */
export async function addMonth(userId: number, paidOn: string) {
  const last = await one<{ e: string }>(`select to_char(max(expires_on),'YYYY-MM-DD') as e from memberships where user_id = $1`, [userId]);
  const start = last?.e && last.e > paidOn ? last.e : paidOn;
  await q(`insert into memberships (user_id, paid_on, expires_on) values ($1, $2::date, $2::date + 30)`, [userId, start]);
}

export const METHOD_LABEL: Record<string, string> = { transferencia: 'Depósito o transferencia', mercadopago: 'Mercado Pago', efectivo: 'Efectivo' };
