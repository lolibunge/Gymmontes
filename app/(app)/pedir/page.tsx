import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { routineDays } from '@/lib/data';
import { DIAS, DIAS_CORTO, corta, toIso } from '@/lib/dates';
import { whatsappLink } from '@/lib/notify';
import { sendRequest } from '../perfil/actions';
import { Arrow } from '@/components/Icons';
import Chips from './Chips';
import AdjustChips from './AdjustChips';

type Last = { status: string; created_at: Date; goals: string[]; days: number | null; notes: string | null; kind: string; change: string | null; weekday: number | null; exercise: string | null };

export default async function Pedir({ searchParams }: { searchParams: { enviado?: string; tipo?: string; falta?: string } }) {
  const user = await requireUser();
  const [last, injuries, rdays] = await Promise.all([
    one<Last>('select status, created_at, goals, days, notes, kind, change, weekday, exercise from routine_requests where user_id = $1 order by id desc limit 1', [user.id]),
    one<{ t: string }>(`select string_agg(title || coalesce(': ' || notes, ''), '. ') as t from injuries where user_id = $1`, [user.id]),
    routineDays(user.id),
  ]);
  const hasRoutine = rdays.length > 0;
  // Con rutina, lo habitual es ajustarla; "Rutina nueva" sigue disponible.
  const tipo = hasRoutine && searchParams.tipo !== 'nueva' ? 'ajuste' : 'nueva';
  const exercises = Array.from(new Set(rdays.flatMap((d) => d.items.map((i) => i.name))));
  const ajuste = last?.kind === 'ajuste';

  const wa = last && last.status === 'Enviado'
    ? whatsappLink(ajuste
      ? `Hola! Soy ${user.name}. Pedí un ajuste en mi rutina de GYM MONTES: ${last.change ?? ''}${last.weekday ? ` (${DIAS[last.weekday]})` : ''}${last.exercise ? `, ${last.exercise}` : ''}.${last.notes ? ` ${last.notes}` : ''}`
      : `Hola! Soy ${user.name} y acabo de pedir mi rutina en la app de GYM MONTES. Busco: ${last.goals.join(', ') || '—'}. Puedo ir ${last.days ?? '—'} días por semana.${last.notes ? ` Lesiones: ${last.notes}` : ''}`)
    : null;

  return (
    <main className="page">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg">{hasRoutine ? 'Pedí un cambio' : 'Pedí tu rutina'}</h1>
        <p className="muted">{hasRoutine ? 'Pedile a la entrenadora un ajuste en tu rutina, o una rutina nueva.' : 'La entrenadora la arma según lo que le cuentes y te llega acá.'}</p>
      </header>

      {last && (searchParams.enviado || last.status === 'Enviado' || !hasRoutine) && (
        <div className={`card ${last.status === 'Lista' ? 'bg-violeta' : 'bg-venda'}`} style={{ padding: '14px 16px' }}>
          <span className="strong" style={{ color: last.status === 'Lista' ? 'var(--on-violeta)' : 'var(--violeta-texto)' }}>
            {last.status === 'Lista' ? (ajuste ? '¡Tu rutina se actualizó!' : '¡Tu rutina está lista!') : searchParams.enviado ? '¡Pedido enviado!' : 'Pedido en preparación'}
          </span>
          <span className="caption">
            {last.status === 'Lista'
              ? 'Ya la ves en Inicio y en Rutinas.'
              : ajuste
                ? `${last.change ?? 'Ajuste'}${last.weekday ? ` · ${DIAS[last.weekday]}` : ''}${last.exercise ? ` · ${last.exercise}` : ''}. Enviado el ${corta(toIso(last.created_at))}; cuando la entrenadora lo cambie, lo ves en Rutinas.`
                : `Enviado el ${corta(toIso(last.created_at))}. La entrenadora ya lo tiene en su bandeja; cuando la arme, aparece en tu Inicio.`}
          </span>
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="btn" style={{ background: '#25d366', color: '#0b2e17', justifyContent: 'center', marginTop: 4, fontSize: 14 }}>
              Avisar por WhatsApp
            </a>
          )}
        </div>
      )}

      {hasRoutine && (
        <nav aria-label="Tipo de pedido" style={{ display: 'flex', padding: 4, gap: 4, borderRadius: 6, background: 'var(--cuerda)' }}>
          {[['ajuste', 'Ajustar mi rutina'], ['nueva', 'Rutina nueva']].map(([k, label]) => (
            <Link key={k} href={`/pedir?tipo=${k}`} aria-current={tipo === k ? 'page' : undefined}
              style={{ flex: 1, textAlign: 'center', padding: '10px 0', borderRadius: 4, fontSize: 14, fontWeight: 600,
                background: tipo === k ? 'var(--lona)' : 'transparent', color: tipo === k ? 'var(--guante)' : 'var(--campana)',
                boxShadow: tipo === k ? 'inset 0 0 0 1.5px var(--guante)' : 'none' }}>{label}</Link>
          ))}
        </nav>
      )}

      {tipo === 'ajuste' ? (
        <form action={sendRequest} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <input type="hidden" name="kind" value="ajuste" />
          <AdjustChips days={rdays.map((d) => ({ weekday: d.weekday, label: DIAS_CORTO[d.weekday] }))} exercises={exercises} />
          <label className="field">
            <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', color: 'var(--guante)' }}>Contale qué</span>
            <textarea className="input" name="notes" rows={4} placeholder="Ej.: el step-up me molesta la rodilla, ¿lo cambiamos? / Quiero sumar algo de abdominales el viernes." />
          </label>
          {searchParams.falta && <p role="alert" className="caption" style={{ color: 'var(--alerta)', fontWeight: 600 }}>Elegí un ejercicio o contale qué querés cambiar.</p>}
          <button className="btn btn-primary">Enviar pedido de ajuste <Arrow /></button>
          <p className="caption muted" style={{ marginTop: -10 }}>Tu rutina sigue igual hasta que la entrenadora haga el cambio.</p>
        </form>
      ) : (
        <form action={sendRequest} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <Chips />
          <label className="field">
            <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', color: 'var(--guante)' }}>Lesiones o molestias</span>
            <textarea className="input" name="notes" rows={5} defaultValue={injuries?.t ?? ''} placeholder="Contale a la entrenadora si algo te duele o tenés indicaciones médicas." />
          </label>
          <button className="btn btn-primary">{hasRoutine ? 'Pedir rutina nueva' : last ? 'Enviar otro pedido' : 'Enviar pedido'} <Arrow /></button>
          {hasRoutine && <p className="caption muted" style={{ marginTop: -10 }}>La nueva reemplaza a la actual cuando la entrenadora la suba. Tu historial no se borra.</p>}
        </form>
      )}
    </main>
  );
}
