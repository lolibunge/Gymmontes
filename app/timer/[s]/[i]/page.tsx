import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { DIAS, weekdayOf } from '@/lib/dates';
import TimerRunner from './TimerRunner';

export const dynamic = 'force-dynamic';

export default async function Timer({ params }: { params: { s: string; i: string } }) {
  const user = await requireUser();
  const row = await one<{ segments: { label: string; min: number }[]; name: string; date: string; note: string | null }>(
    `select i.segments, e.name, to_char(s.date,'YYYY-MM-DD') as date, i.note
       from sessions s join day_items i on i.day_id = s.day_id join exercises e on e.id = i.exercise_id
      where s.id = $1 and s.user_id = $2 and i.id = $3 and i.kind = 'cardio'`,
    [Number(params.s), user.id, Number(params.i)]
  );
  if (!row) notFound();
  return <TimerRunner sessionId={Number(params.s)} itemId={Number(params.i)} title={`${row.name} · ${DIAS[weekdayOf(row.date)]}`} segments={row.segments} />;
}
