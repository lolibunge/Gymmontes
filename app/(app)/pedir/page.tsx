import { requireUser } from '@/lib/auth';
import { one } from '@/lib/db';
import { corta, toIso } from '@/lib/dates';
import { sendRequest } from '../perfil/actions';
import { Arrow } from '@/components/Icons';
import Chips from './Chips';

export default async function Pedir({ searchParams }: { searchParams: { enviado?: string } }) {
  const user = await requireUser();
  const last = await one<{ status: string; created_at: Date }>('select status, created_at from routine_requests where user_id = $1 order by id desc limit 1', [user.id]);
  const injuries = await one<{ t: string }>(`select string_agg(title || coalesce(': ' || notes, ''), '. ') as t from injuries where user_id = $1`, [user.id]);
  return (
    <main className="page">
      <header style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <h1 className="title-lg">Pedí tu rutina</h1>
        <p className="muted">La entrenadora la arma según lo que le cuentes y te llega acá.</p>
      </header>
      {(searchParams.enviado || last) && (
        <div className="card bg-venda" style={{ padding: '12px 14px' }}>
          <span className="strong brand">{searchParams.enviado ? '¡Pedido enviado!' : `Último pedido: ${last!.status.toLowerCase()}`}</span>
          {last && <span className="caption">Enviado el {corta(toIso(last.created_at))}. Te avisamos cuando tu rutina esté lista.</span>}
        </div>
      )}
      <form action={sendRequest} style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
        <Chips />
        <label className="field">
          <span style={{ fontFamily: 'var(--font-archivo)', fontWeight: 700, fontSize: 12, letterSpacing: '0.12em', color: 'var(--guante)' }}>Lesiones o molestias</span>
          <textarea className="input" name="notes" rows={5} defaultValue={injuries?.t ?? ''} placeholder="Contale a la entrenadora si algo te duele o tenés indicaciones médicas." />
        </label>
        <button className="btn btn-primary">Enviar pedido <Arrow /></button>
      </form>
    </main>
  );
}
