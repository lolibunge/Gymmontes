import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { corta, toIso } from '@/lib/dates';
import { whatsappLink } from '@/lib/notify';
import { sendRequest } from '../perfil/actions';
import { Arrow } from '@/components/Icons';
import Chips from './Chips';

export default async function Pedir({ searchParams }: { searchParams: { enviado?: string } }) {
  const user = await requireUser();
  const last = await one<{ status: string; created_at: Date; goals: string[]; days: number | null; notes: string | null }>(
    'select status, created_at, goals, days, notes from routine_requests where user_id = $1 order by id desc limit 1', [user.id]);
  const injuries = await one<{ t: string }>(`select string_agg(title || coalesce(': ' || notes, ''), '. ') as t from injuries where user_id = $1`, [user.id]);
  const wa = last && last.status === 'Enviado'
    ? whatsappLink(`Hola! Soy ${user.name} y acabo de pedir mi rutina en la app de GYM MONTES. Busco: ${last.goals.join(', ') || '—'}. Puedo ir ${last.days ?? '—'} días por semana.${last.notes ? ` Lesiones: ${last.notes}` : ''}`)
    : null;
  return (
    <main className="page">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg">Pedí tu rutina</h1>
        <p className="muted">La entrenadora la arma según lo que le cuentes y te llega acá.</p>
      </header>
      {last && (
        <div className={`card ${last.status === 'Lista' ? 'bg-violeta' : 'bg-venda'}`} style={{ padding: '14px 16px' }}>
          <span className="strong" style={{ color: last.status === 'Lista' ? 'var(--on-violeta)' : 'var(--violeta-texto)' }}>
            {last.status === 'Lista' ? '¡Tu rutina está lista!' : searchParams.enviado ? '¡Pedido enviado!' : 'Pedido en preparación'}
          </span>
          <span className="caption">
            {last.status === 'Lista'
              ? 'Ya la ves en Inicio y en Rutinas. Si querés otra, podés volver a pedir.'
              : `Enviado el ${corta(toIso(last.created_at))}. La entrenadora ya lo tiene en su bandeja; cuando la arme, aparece en tu Inicio.`}
          </span>
          {wa && (
            <a href={wa} target="_blank" rel="noopener" className="btn" style={{ background: '#25d366', color: '#0b2e17', justifyContent: 'center', marginTop: 4, fontSize: 14 }}>
              Avisar por WhatsApp
            </a>
          )}
        </div>
      )}
      <form action={sendRequest} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Chips />
        <label className="field">
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', color: 'var(--guante)' }}>Lesiones o molestias</span>
          <textarea className="input" name="notes" rows={5} defaultValue={injuries?.t ?? ''} placeholder="Contale a la entrenadora si algo te duele o tenés indicaciones médicas." />
        </label>
        <button className="btn btn-primary">{last ? 'Enviar otro pedido' : 'Enviar pedido'} <Arrow /></button>
      </form>
    </main>
  );
}
