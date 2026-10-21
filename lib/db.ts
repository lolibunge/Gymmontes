import { Pool, type QueryResultRow } from 'pg';

declare global {
  // eslint-disable-next-line no-var
  var __gmPool: Pool | undefined;
}

function connectionString() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) throw new Error('Falta DATABASE_URL: conectá Neon al proyecto en Vercel.');
  const u = new URL(raw);
  u.searchParams.delete('channel_binding');
  return u.toString();
}

function pool() {
  if (!global.__gmPool) global.__gmPool = new Pool({ connectionString: connectionString(), max: 5 });
  return global.__gmPool;
}

export async function q<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T[]> {
  const r = await pool().query<T>(text, params);
  return r.rows;
}

export async function one<T extends QueryResultRow = any>(text: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(text, params);
  return rows[0] ?? null;
}
