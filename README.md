# GYM MONTES · App socios

Web app instalable (PWA) para los socios de GYM MONTES: rutina del día, registro de kg y reps por serie, timer por tramos para el cardio, ficha de cada máquina por QR, pedido de rutina, cuota con aviso de vencimiento, retos, sorteos y novedades. Modo claro, oscuro o automático.

Hecha con Next.js 14 y Postgres (Neon), lista para publicar en Vercel.

## Publicar en Vercel

1. En Vercel: **Add New → Project** e importá este repositorio.
2. En **Settings → Environment Variables** cargá:
   - `DATABASE_URL`: la cadena de conexión de Neon. Si conectás Neon desde la pestaña **Storage** del proyecto, Vercel la carga sola.
   - `AUTH_SECRET`: un texto largo y secreto cualquiera (firma las sesiones de login).
   - `NEXT_PUBLIC_SPOTIFY_PLAYLIST` (opcional): el link de la playlist del gimnasio en Spotify.
   - `DEMO_PIN` y `OWNER_PIN` (opcionales): los PIN de las cuentas de ejemplo. Si no se cargan, son `1234` y `4321`.
3. **Deploy.** En cada build, `scripts/db.mjs` crea las tablas si no existen y, si la base está vacía, carga los datos de ejemplo.

## Cuentas de ejemplo

| Usuario | Email | PIN |
|---|---|---|
| Loli (socia, con su rutina real de 5 días) | `loli@gymmontes.uy` | `DEMO_PIN` o `1234` |
| Dueña | `duena@gymmontes.uy` | `OWNER_PIN` o `4321` |

## Instalar en el celular

- **Android (Chrome):** menú ⋮ → **Instalar app**.
- **iPhone (Safari):** botón Compartir → **Agregar a pantalla de inicio**.

## QR de las máquinas

Cada máquina tiene un código (`M01`…`M09`). El sticker QR apunta a `https://<tu-dominio>/m/M07` y abre la ficha de esa máquina con los pasos y, cuando se cargue, el video.

## Desarrollo local

```bash
npm install
cp .env.example .env.local   # completá DATABASE_URL
npm run db                   # crea tablas y datos de ejemplo
npm run dev
```

## Estructura

- `app/login`: ingreso con email y PIN.
- `app/(app)`: pantallas con menú inferior (Inicio, Rutina, Sesión, Pedir, Perfil, Historial, Comunidad, Escanear).
- `app/timer`: timer de cardio por tramos (pantalla completa).
- `app/ejercicio` y `app/m`: ficha de máquina y redirección desde el QR.
- `lib/`: conexión a la base, sesiones de login y consultas.
- `scripts/db.mjs`: esquema y datos de ejemplo.

## Próximo paso

Panel de la dueña: cargar y asignar rutinas, responder pedidos, marcar pagos de cuota, publicar novedades, retos y sorteos, y subir los videos de las máquinas.
