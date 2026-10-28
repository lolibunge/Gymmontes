// Crea las tablas (si no existen) y carga los datos de ejemplo la primera vez.
// Corre solo antes de cada build en Vercel. Si no hay DATABASE_URL, no hace nada.
import { EXERCISE_INFO } from './exercise-info.mjs';
import pg from 'pg';
import crypto from 'node:crypto';

function connectionString() {
  const raw = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  if (!raw) return null;
  const u = new URL(raw);
  u.searchParams.delete('channel_binding');
  return u.toString();
}

export function hashPin(pin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pin), salt, 32).toString('hex');
  return `${salt}:${hash}`;
}

const SCHEMA = `
create table if not exists users (
  id serial primary key,
  name text not null,
  email text not null unique,
  pin_hash text not null,
  role text not null default 'socio',
  theme text not null default 'auto',
  phone text, birth text, weight_kg numeric, height_cm numeric, emergency text,
  goals_text text, goal_tags text[] not null default '{}',
  member_since date not null default current_date,
  created_at timestamptz not null default now()
);
alter table users add column if not exists auth_provider text not null default 'password';
alter table users add column if not exists show_birthday boolean not null default true;
create table if not exists exercises (
  id serial primary key,
  slug text not null unique,
  name text not null,
  muscle text,
  machine_code text unique,
  steps jsonb not null default '[]',
  video_url text
);
alter table exercises drop constraint if exists exercises_machine_code_key;
create table if not exists machines (
  code text primary key,
  name text
);
create table if not exists routines (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  title text not null,
  objective text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create table if not exists routine_days (
  id serial primary key,
  routine_id int not null references routines(id) on delete cascade,
  weekday int not null,
  title text not null,
  subtitle text,
  note text
);
create table if not exists day_items (
  id serial primary key,
  day_id int not null references routine_days(id) on delete cascade,
  position int not null,
  kind text not null default 'ejercicio',
  exercise_id int references exercises(id),
  sets int, reps text, weight_kg numeric, rest_s int default 90,
  raise_weight boolean not null default false,
  note text,
  segments jsonb
);
alter table day_items add column if not exists removed boolean not null default false;
create table if not exists sessions (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  day_id int references routine_days(id) on delete set null,
  date date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);
create table if not exists set_logs (
  id serial primary key,
  session_id int not null references sessions(id) on delete cascade,
  item_id int not null references day_items(id) on delete cascade,
  set_no int not null,
  kg numeric, reps int, minutes int,
  done boolean not null default false,
  unique (session_id, item_id, set_no)
);
create table if not exists set_feel (
  session_id int not null references sessions(id) on delete cascade,
  item_id int not null references day_items(id) on delete cascade,
  feel text not null check (feel in ('liviano','justo','pesado')),
  primary key (session_id, item_id)
);
create table if not exists memberships (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  paid_on date not null,
  expires_on date not null
);
create table if not exists gym_settings (
  key text primary key,
  value text
);
create table if not exists payment_reports (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  method text not null,
  paid_on date not null,
  note text,
  receipt bytea,
  receipt_type text,
  status text not null default 'pendiente',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);
create table if not exists injuries (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  title text not null,
  status text not null default 'En seguimiento',
  notes text
);
create table if not exists routine_requests (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  goals text[] not null default '{}',
  days int,
  notes text,
  status text not null default 'Enviado',
  created_at timestamptz not null default now()
);
alter table routine_requests add column if not exists kind text not null default 'nueva';
alter table routine_requests add column if not exists change text;
alter table routine_requests add column if not exists weekday int;
alter table routine_requests add column if not exists exercise text;
create table if not exists challenges (
  id serial primary key,
  title text not null,
  description text,
  target int not null,
  month text not null
);
create table if not exists raffles (
  id serial primary key,
  title text not null,
  closes_on date not null
);
alter table raffles add column if not exists winner_id int references users(id) on delete set null;
create table if not exists raffle_entries (
  raffle_id int not null references raffles(id) on delete cascade,
  user_id int not null references users(id) on delete cascade,
  primary key (raffle_id, user_id)
);
create table if not exists news (
  id serial primary key,
  date date not null,
  title text not null,
  body text
);
create table if not exists notes (
  id serial primary key,
  user_id int not null references users(id) on delete cascade,
  body text not null,
  context text,
  status text not null default 'nueva',
  created_at timestamptz not null default now()
);
`;

const EX = (slug, name, muscle, code, steps = []) => ({ slug, name, muscle, code, steps });
const EXERCISES = [
  EX('sentadilla-hack', 'Sentadilla en hack', 'Piernas · cuádriceps', 'M01'),
  EX('extension-cuadriceps', 'Extensión de cuádriceps', 'Piernas · cuádriceps', 'M02'),
  EX('step-up', 'Step-up bajo con apoyo', 'Piernas · glúteos'),
  EX('femoral-prono', 'Femoral prono', 'Piernas · isquiotibiales', 'M03'),
  EX('press-pecho-mancuernas', 'Press de pecho con mancuernas', 'Pecho'),
  EX('remo-polea-baja', 'Remo en polea baja', 'Espalda', 'M04'),
  EX('elevacion-talones', 'Elevación de talones', 'Piernas · gemelos', 'M05'),
  EX('jalon-pecho', 'Jalón al pecho', 'Espalda', 'M06'),
  EX('press-hombros', 'Press de hombros con mancuernas', 'Hombros'),
  EX('elevaciones-laterales', 'Elevaciones laterales', 'Hombros'),
  EX('curl-biceps', 'Curl de bíceps con mancuernas', 'Brazos · bíceps'),
  EX('triceps-cuerda', 'Extensión de tríceps con cuerda', 'Brazos · tríceps', 'M08'),
  EX('crunch-carga', 'Crunch abdominal con carga', 'Abdomen'),
  EX('hip-thrust', 'Hip thrust', 'Glúteos'),
  EX('peso-muerto-rumano', 'Peso muerto rumano con mancuernas', 'Piernas · isquiotibiales'),
  EX('patada-lateral-polea', 'Patada lateral en polea', 'Glúteos'),
  EX('press-inclinado', 'Press inclinado con mancuernas', 'Pecho'),
  EX('curl-martillo', 'Curl martillo', 'Brazos · bíceps'),
  EX('prensa', 'Prensa', 'Piernas · cuádriceps y glúteos', 'M07', [
    'Espalda y cadera bien apoyadas en el respaldo.',
    'Pies al ancho de hombros, en el centro de la plataforma.',
    'Bajá controlado hasta 90° de rodilla, sin despegar la cadera.',
    'Empujá con los talones. No trabes las rodillas arriba.',
  ]),
  EX('sentadilla-bulgara', 'Sentadilla búlgara con apoyo', 'Piernas · cuádriceps y glúteos'),
  EX('plancha', 'Plancha abdominal', 'Abdomen'),
  EX('bicicleta', 'Bicicleta fija', 'Cardio', 'M09'),
];

// La rutina real de Loli (de su planilla de GYM MONTES)
const E = (slug, sets, reps, kg, raise = false, note = null) => ({ kind: 'ejercicio', slug, sets, reps, kg, raise, note });
const BICI = (segments, note) => ({ kind: 'cardio', slug: 'bicicleta', segments, note });
const DAYS = [
  { weekday: 1, title: 'Lunes', subtitle: 'Cuádriceps + pecho y espalda', note: 'Priorizar la técnica y el control en los ejercicios de piernas.', items: [
    E('sentadilla-hack', 3, '8–10', 60), E('extension-cuadriceps', 2, '10–12', 30, false, 'Unilateral'),
    E('step-up', 2, '10 / pierna', 5), E('femoral-prono', 2, '12 / pierna', 5, false, 'Unilateral'),
    E('press-pecho-mancuernas', 3, '8–12', 5, true), E('remo-polea-baja', 3, '10–12', 30),
    E('elevacion-talones', 2, '12–15', 60),
  ] },
  { weekday: 2, title: 'Martes', subtitle: 'Tren superior A + cardio', note: null, items: [
    E('jalon-pecho', 3, '10–12', 30), E('press-hombros', 3, '8–12', 10), E('elevaciones-laterales', 3, '12–15', 2.5, true),
    E('curl-biceps', 3, '10–12', 10), E('triceps-cuerda', 3, '10–12', 25), E('crunch-carga', 2, '12–15', 10),
    BICI([{ label: 'Suave', min: 5 }, { label: 'Moderado', min: 20 }, { label: 'Suave', min: 3 }], '5 min suaves + 18–20 min a ritmo moderado + 3 min suaves.'),
  ] },
  { weekday: 3, title: 'Miércoles', subtitle: 'Posteriores y glúteos + tren superior', note: 'Incorporar el peso muerto rumano solo si está autorizado y se realiza sin dolor.', items: [
    E('hip-thrust', 3, '8–12', 40), E('femoral-prono', 3, '10–12', 15), E('peso-muerto-rumano', 3, '8–10', 10, false, 'Solo si está autorizado'),
    E('patada-lateral-polea', 2, '12–15', 15), E('press-inclinado', 3, '10–12', 5), E('remo-polea-baja', 3, '10–12', 30),
  ] },
  { weekday: 4, title: 'Jueves', subtitle: 'Tren superior B + cardio', note: 'Combinar jalón + press de pecho y curl martillo + tríceps en superseries.', items: [
    E('jalon-pecho', 3, '10–12', 30, false, 'Agarre neutro'), E('press-pecho-mancuernas', 3, '10–12', 5), E('elevaciones-laterales', 3, '12–15', 2.5),
    E('curl-martillo', 3, '10–12', 5), E('triceps-cuerda', 3, '12–15', 25, false, 'En polea'),
    BICI([{ label: 'Suave', min: 5 }, ...Array.from({ length: 6 }).flatMap(() => [{ label: 'Intenso', min: 1 }, { label: 'Suave', min: 2 }]), { label: 'Suave', min: 3 }], '5 min suaves + 6 × (1 min intenso / 2 min suaves) + 3 min suaves.'),
  ] },
  { weekday: 5, title: 'Viernes', subtitle: 'Piernas completas + trabajo unilateral', note: 'Realizar la búlgara solo con buena estabilidad y sin molestias.', items: [
    E('prensa', 3, '10–12', 80), E('sentadilla-bulgara', 2, '10 / pierna', 18), E('extension-cuadriceps', 2, '12–15', 30, false, 'Unilateral'),
    E('femoral-prono', 2, '12–15', 15, false, 'Unilateral'), E('elevacion-talones', 3, '12–15', 60), E('plancha', 2, '30–40 s', null),
  ] },
];

async function main() {
  const cs = connectionString();
  if (!cs) {
    console.log('[db] Sin DATABASE_URL: no se crean tablas (build local).');
    return;
  }
  const client = new pg.Client({ connectionString: cs });
  await client.connect();
  try {
    await client.query(SCHEMA);
    const { rows } = await client.query('select count(*)::int as n from users');
    if (rows[0].n > 0) {
      console.log('[db] Tablas listas; ya hay datos, no se carga el ejemplo.');
      await ensureOwners(client);
      await ensurePaySettings(client);
      await ensureExerciseInfo(client);
      await cleanupV11(client);
      return;
    }
    console.log('[db] Cargando datos de ejemplo…');
    await client.query('begin');
    const ex = {};
    for (const e of EXERCISES) {
      const r = await client.query(
        'insert into exercises (slug, name, muscle, machine_code, steps) values ($1,$2,$3,$4,$5) returning id',
        [e.slug, e.name, e.muscle, e.code || null, JSON.stringify(e.steps)]
      );
      ex[e.slug] = r.rows[0].id;
    }
    const loli = await client.query(
      `insert into users (name, email, pin_hash, role, theme, goals_text, goal_tags, member_since)
       values ($1,$2,$3,'socio','auto',$4,$5,'2026-03-01') returning id`,
      ['Loli', 'loli@gymmontes.uy', hashPin(process.env.DEMO_PIN || '1234'),
       'Mejorar la composición corporal, desarrollar resistencia cardiovascular y fortalecer cuádriceps, isquiotibiales y glúteos, priorizando el control y la simetría entre piernas.',
       ['Fuerza', 'Resistencia', 'Composición corporal']]
    );
    const uid = loli.rows[0].id;
    await client.query(
      `insert into users (name, email, pin_hash, role) values ('Dueña GYM MONTES','duena@gymmontes.uy',$1,'duena')`,
      [hashPin(process.env.OWNER_PIN || '4321')]
    );
    const rt = await client.query(
      `insert into routines (user_id, title, objective) values ($1,'Fuerza + cardio · 5 días',$2) returning id`,
      [uid, 'Mejorar la composición corporal, desarrollar resistencia cardiovascular y fortalecer cuádriceps, isquiotibiales y glúteos.']
    );
    const firstItem = {};
    for (const d of DAYS) {
      const dr = await client.query(
        'insert into routine_days (routine_id, weekday, title, subtitle, note) values ($1,$2,$3,$4,$5) returning id',
        [rt.rows[0].id, d.weekday, d.title, d.subtitle, d.note]
      );
      let pos = 1;
      for (const it of d.items) {
        const ir = await client.query(
          `insert into day_items (day_id, position, kind, exercise_id, sets, reps, weight_kg, raise_weight, note, segments)
           values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) returning id`,
          [dr.rows[0].id, pos++, it.kind, ex[it.slug], it.sets ?? null, it.reps ?? null, it.kg ?? null, it.raise ?? false, it.note, it.segments ? JSON.stringify(it.segments) : null]
        );
        if (!firstItem[d.weekday]) firstItem[d.weekday] = { day: dr.rows[0].id, item: ir.rows[0].id };
      }
    }
    await client.query(`insert into memberships (user_id, paid_on, expires_on) values ($1,'2026-10-12','2026-11-11')`, [uid]);
    await client.query(
      `insert into injuries (user_id, title, status, notes) values
       ($1,'Cuidado de la pierna','En seguimiento','Empezar los unilaterales por la izquierda y repetir las mismas reps en ambas. Si aparece dolor, frenar.'),
       ($1,'Peso muerto rumano','Pendiente de autorización','Solo si lo autoriza el médico y se hace sin dolor.')`,
      [uid]
    );
    await client.query(
      `insert into challenges (title, description, target, month) values
       ('12 sesiones en el mes','Que toda la energía de tu día a día sirva para construir tu mejor versión. ¡Vamos!',12,'2026-10'),
       ('12 sesiones en el mes','Que toda la energía de tu día a día sirva para construir tu mejor versión. ¡Vamos!',12,'2026-11')`
    );
    await client.query(`insert into raffles (title, closes_on) values ('Un mes gratis','2026-10-31')`);
    await client.query(
      `insert into news (date, title, body) values
       ('2026-11-02','Feriado: horario especial','[La dueña carga acá el horario del feriado.]'),
       ('2026-10-20','Ya está la app de GYM MONTES','Escaneá el QR de cada máquina para ver cómo se usa.')`
    );
    await client.query('commit');
    await ensureOwners(client);
    await ensurePaySettings(client);
    await ensureExerciseInfo(client);
    console.log('[db] Listo.');
  } catch (e) {
    await client.query('rollback').catch(() => {});
    throw e;
  } finally {
    await client.end();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((e) => {
    console.error('[db] Error:', e.message);
    process.exit(1);
  });
}

// La dueña: OWNER_EMAIL la marca como dueña. Si además está OWNER_PASSWORD,
// se crea la cuenta (si no existe) o se le pone esa contraseña. Sirve para
// entrar la primera vez o para recuperar el acceso.
// Formas de cobro de GYM MONTES. Solo se cargan si la dueña todavía no guardó las suyas en Gym → Cobros.
// Pasos, zona y video de cada ejercicio: completa solo lo que esté vacío.
async function ensureExerciseInfo(client) {
  const norm = (t) => t.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const map = new Map();
  for (const info of EXERCISE_INFO) for (const n of info.names) map.set(norm(n), info);
  const { rows } = await client.query('select id, name from exercises');
  let n = 0;
  for (const r of rows) {
    const info = map.get(norm(r.name));
    if (!info) continue;
    const u = await client.query(
      `update exercises set
         muscle = coalesce(nullif(muscle, ''), $2),
         steps = case when jsonb_array_length(steps) = 0 then $3::jsonb else steps end,
         video_url = case when video_url is null or video_url = '' or video_url like '%youtube.com/results?%' then $4 else video_url end
       where id = $1 and (muscle is null or muscle = '' or jsonb_array_length(steps) = 0 or video_url is null or video_url = '' or video_url like '%youtube.com/results?%')`,
      [r.id, info.muscle, JSON.stringify(info.steps), info.video]
    );
    n += u.rowCount;
  }
  if (n) console.log(`[db] Pasos y videos cargados en ${n} ejercicios.`);
}

async function ensurePaySettings(client) {
  const defaults = [
    ['pay_fee', '$ 1.200'],
    ['pay_day_fee', '$ 200'],
    ['pay_cash', 'si'],
    ['pay_bank', 'OCA Blue · cuenta 6923800\nGiro o depósito (Abitab, RedPagos)\nEn el concepto poné tu nombre'],
  ];
  for (const [k, v] of defaults) {
    await client.query('insert into gym_settings (key, value) values ($1,$2) on conflict (key) do nothing', [k, v]);
  }
}

/**
 * v1.1: el reto del mes contaba sesiones que no se hicieron.
 * - Borra la sesión de ejemplo del 12/10 que venía cargada en la cuenta demo.
 * - Borra sesiones "terminadas" sin ninguna serie hecha.
 * Corre una sola vez (queda marcado en gym_settings).
 */
async function cleanupV11(client) {
  const done = await client.query(`select 1 from gym_settings where key = 'cleanup_v1_1'`);
  if (done.rowCount) return;
  const demo = await client.query(
    `delete from sessions s using users u
      where u.id = s.user_id and u.email = 'loli@gymmontes.uy' and s.date = '2026-10-12'
        and s.finished_at = '2026-10-12 20:00-03'::timestamptz`
  );
  const empty = await client.query(
    `delete from sessions s where s.finished_at is not null
       and not exists (select 1 from set_logs l where l.session_id = s.id and l.done)`
  );
  await client.query(`insert into gym_settings (key, value) values ('cleanup_v1_1', now()::text) on conflict (key) do nothing`);
  console.log(`[db] v1.1: ${demo.rowCount} sesión de ejemplo y ${empty.rowCount} sesiones vacías borradas.`);
}

async function ensureOwners(client) {
  const owners = (process.env.OWNER_EMAIL || '').split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);
  if (!owners.length) return;
  const pw = process.env.OWNER_PASSWORD;
  for (const email of owners) {
    if (pw) {
      const r = await client.query(
        `update users set role = 'duena', pin_hash = $2, auth_provider = 'password' where lower(email) = $1`,
        [email, hashPin(pw)]
      );
      if (r.rowCount) console.log(`[db] Contraseña de ${email} actualizada desde OWNER_PASSWORD.`);
      else {
        await client.query(
          `insert into users (name, email, pin_hash, auth_provider, role) values ($1,$2,$3,'password','duena')`,
          [email.split('@')[0].replace(/^./, (c) => c.toUpperCase()), email, hashPin(pw)]
        );
        console.log(`[db] Cuenta de dueña creada para ${email}.`);
      }
    } else {
      const up = await client.query(`update users set role = 'duena' where lower(email) = $1 and role <> 'duena'`, [email]);
      if (up.rowCount) console.log(`[db] Cuenta de dueña activada para ${email}.`);
    }
  }
}
