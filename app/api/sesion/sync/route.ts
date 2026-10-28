import { NextResponse } from 'next/server';
import { currentUser } from '@/lib/auth';
import { q } from '@/lib/db';

export const dynamic = 'force-dynamic';

type Op =
  | { t: 'set'; s: number; i: number; n: number; kg: number | null; reps: number | null; done: boolean }
  | { t: 'feel'; s: number; i: number; feel: 'liviano' | 'justo' | 'pesado' | null }
  | { t: 'cardio'; s: number; i: number; minutes: number };

const int = (v: unknown) => (Number.isInteger(v) ? (v as number) : null);
const numOrNull = (v: unknown) => (v == null || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);

/** Recibe los cambios guardados en el teléfono (ver lib/outbox.ts) y los aplica. Es idempotente. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: 'login' }, { status: 401 });
  let body: { ops?: Op[] };
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'json' }, { status: 400 }); }
  const ops = Array.isArray(body.ops) ? body.ops.slice(0, 500) : [];
  const ids = Array.from(new Set(ops.map((o) => int(o.s)).filter((x): x is number => x != null)));
  if (!ids.length) return NextResponse.json({ ok: true, n: 0 });
  const own = new Set(
    (await q<{ id: number }>('select id from sessions where user_id = $1 and id = any($2)', [user.id, ids])).map((r) => r.id)
  );
  let n = 0;
  for (const o of ops) {
    const s = int(o.s), i = int(o.i);
    // Sesiones borradas o ajenas: se descartan sin error para que no queden trabadas en el teléfono
    if (s == null || i == null || !own.has(s)) continue;
    if (o.t === 'set') {
      const setNo = int(o.n);
      if (setNo == null || setNo < 1 || setNo > 20) continue;
      const reps = numOrNull(o.reps);
      await q(
        `insert into set_logs (session_id, item_id, set_no, kg, reps, done) values ($1,$2,$3,$4,$5,$6)
         on conflict (session_id, item_id, set_no) do update set kg = excluded.kg, reps = excluded.reps, done = excluded.done`,
        [s, i, setNo, numOrNull(o.kg), reps == null ? null : Math.round(reps), !!o.done]
      ).catch(() => {});
    } else if (o.t === 'feel') {
      if (!o.feel) await q('delete from set_feel where session_id = $1 and item_id = $2', [s, i]);
      else if (['liviano', 'justo', 'pesado'].includes(o.feel)) {
        await q(
          `insert into set_feel (session_id, item_id, feel) values ($1,$2,$3)
           on conflict (session_id, item_id) do update set feel = excluded.feel`,
          [s, i, o.feel]
        ).catch(() => {});
      }
    } else if (o.t === 'cardio') {
      const m = Math.max(0, Math.round(Number(o.minutes) || 0));
      await q(
        `insert into set_logs (session_id, item_id, set_no, minutes, done) values ($1,$2,1,$3,true)
         on conflict (session_id, item_id, set_no) do update set minutes = excluded.minutes, done = true`,
        [s, i, m]
      ).catch(() => {});
    }
    n++;
  }
  return NextResponse.json({ ok: true, n });
}
