# GYM MONTES · App socios

Web app instalable (PWA) para los socios de GYM MONTES: rutina del día, registro de kg y reps por serie, timer por tramos para el cardio, ficha de cada máquina por QR, pedido de rutina, cuota con aviso de vencimiento, retos, sorteos y novedades. Modo claro, oscuro o automático.

Hecha con Next.js 14 y Postgres (Neon), lista para publicar en Vercel.

## Publicar en Vercel

1. En Vercel: **Add New → Project** e importá este repositorio.
2. En **Settings → Environment Variables** cargá:
   - `DATABASE_URL`: la cadena de conexión de Neon. Si conectás Neon desde la pestaña **Storage** del proyecto, Vercel la carga sola.
   - `AUTH_SECRET`: un texto largo y secreto cualquiera (firma las sesiones de login).
   - `NEXT_PUBLIC_SPOTIFY_PLAYLIST` (opcional): el link de la playlist del gimnasio en Spotify.
   - `DEMO_PIN` y `OWNER_PIN` (opcionales): las contraseñas de las cuentas de ejemplo. Si no se cargan, son `1234` y `4321`.
   - `GYM_CODE` (opcional): si se carga, para crear una cuenta hay que escribir este código (lo da la entrenadora en recepción). Si no, el registro es libre.
   - `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET` (opcionales): activan "Continuar con Google". Ver más abajo.
   - `APP_URL` (opcional): la dirección pública, por ejemplo `https://gymmontes.vercel.app`. Se usa para volver desde Google y en los emails.
   - `OWNER_EMAIL`: el email de la dueña. Esa cuenta entra al panel `/admin` y recibe los avisos de pedidos. Puede ser más de uno, separados por coma.
   - `OWNER_PASSWORD` (opcional): en el próximo deploy crea la cuenta de `OWNER_EMAIL` con esta contraseña, o se la cambia si ya existe. Sirve para entrar la primera vez o si te olvidaste la contraseña. Después de entrar, borrala y hacé Redeploy.
   - `RESEND_API_KEY` y `EMAIL_FROM` (opcionales): mandan un email a `OWNER_EMAIL` con cada pedido de rutina y activan "¿Te olvidaste la contraseña?" por email (cuenta gratis en resend.com). Para mandar a cualquier socio, Resend pide verificar un dominio propio en `EMAIL_FROM`.
   - `GYM_WHATSAPP` (opcional): número del gimnasio con código de país, sin espacios (ej. `59899123456`). Al pedir rutina, el socio ve un botón para avisar por WhatsApp.
3. **Deploy.** En cada build, `scripts/db.mjs` crea las tablas si no existen y, si la base está vacía, carga los datos de ejemplo.

## Cuentas de ejemplo

| Usuario | Email | Contraseña |
|---|---|---|
| Loli (socia, con su rutina real de 5 días) | `loli@gymmontes.uy` | `DEMO_PIN` o `1234` |
| Dueña | `duena@gymmontes.uy` | `OWNER_PIN` o `4321` |

## Crear cuenta

Los socios crean su cuenta en `/registro` con nombre, email y contraseña (mínimo 8 caracteres), o con **Continuar con Google**. Una cuenta nueva arranca sin rutina y el Inicio la invita a pedirla.

### Activar "Continuar con Google"

1. Entrá a [Google Cloud Console](https://console.cloud.google.com/) y creá un proyecto (por ejemplo "GYM MONTES").
2. **APIs y servicios → Pantalla de consentimiento de OAuth**: tipo *Externo*, nombre "GYM MONTES", tu email de soporte. Publicala.
3. **APIs y servicios → Credenciales → Crear credenciales → ID de cliente de OAuth**, tipo *Aplicación web*.
4. En **URI de redireccionamiento autorizados** agregá `https://gymmontes.vercel.app/api/auth/google/callback`.
5. Copiá el *ID de cliente* y el *Secreto* a Vercel como `GOOGLE_CLIENT_ID` y `GOOGLE_CLIENT_SECRET`, cargá `APP_URL=https://gymmontes.vercel.app` y hacé Redeploy.

Hasta que estén cargadas, el botón de Google no aparece.

## Contraseñas

- En el ingreso, **Ver** muestra lo que escribiste. Si el email tiene un error típico (`@mail.com`, `@gmial.com`…), la app sugiere el correcto.
- **¿Te olvidaste la contraseña?**: con `RESEND_API_KEY`, llega un link por email (vale 1 hora y una sola vez). Sin email, la dueña entra a la ficha del socio → **Acceso → Generar contraseña nueva** y se la pasa.
- Cada socio cambia su contraseña en **Perfil → Datos personales**.

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

- `app/login` y `app/registro`: ingreso y creación de cuenta (email y contraseña, o Google en `app/api/auth/google`).
- `app/(app)`: pantallas con menú inferior (Inicio, Rutina, Sesión, Pedir, Perfil, Historial, Comunidad, Escanear).
- `app/timer`: timer de cardio por tramos (pantalla completa).
- `app/ejercicio` y `app/m`: ficha de máquina y redirección desde el QR.
- `lib/`: conexión a la base, sesiones de login y consultas.
- `scripts/db.mjs`: esquema y datos de ejemplo.

## Panel de la dueña (`/admin`)

La dueña (la cuenta de `OWNER_EMAIL`) entra directo al panel y no ve la app de socio. Tiene su propio menú: **Resumen · Pedidos · Socios · Gym**.

- **Resumen:** pedidos nuevos, socios, cuotas por vencer y vencidas, lo que hay que hacer hoy y la actividad de la semana.
- **Gym:** publicar y borrar novedades, programar el reto del mes y el del mes siguiente, abrir un sorteo y sortear el ganador entre los anotados.

- **Pedidos:** bandeja con los pedidos de rutina nuevos (con contador), objetivos, días y lesiones de cada socio.
- **Socios:** lista con estado de cuota (al día, por vencer en 7 días, vencida), rutina y última sesión.
- **Ficha del socio:** registrar pago (30 días desde la fecha elegida), ver su rutina, objetivos y lesiones.
- **Subir rutina:** desde un link de Google Sheets o un CSV con la plantilla `public/plantilla-rutina.csv`, con vista previa antes de guardar. Reemplaza la rutina anterior sin borrar el historial.
- **Editar rutina:** series, reps, peso y la marca ▲ de subir peso.

## Novedades v1.2

- **Calentamiento y enfriamiento** guiados al principio y al final de cada sesión, con un timer por paso. Se pueden saltear. La entrenadora los edita en Gym → Calentamiento.
- **Descanso en pantalla completa**: se abre al marcar una serie y muestra lo que sigue. Con la X se achica a la barra de siempre, y el descanso sigue corriendo.
- **Avisos aunque estés en otra app**: si te vas a Spotify o WhatsApp con el descanso o la bici andando, aparece una notificación fija ("Descanso · termina 08:42") y, a la hora justa, otra que suena y vibra (`public/sw.js`, `lib/bgnotify.ts`). Pide permiso una vez desde el descanso o el timer.
- **Más rápido**: "la vez pasada" se calcula en una sola consulta, las pantallas muestran un esqueleto apenas tocás y los botones de Empezar responden al instante.

## Novedades v1.1

- **Descanso entre series**: al marcar una serie arranca un descanso de 1:30 (−15/+15 o saltar). El descanso por defecto se cambia en la sesión y queda guardado en el teléfono.
- **Nada se pierde**: kg, reps y series se guardan primero en el teléfono y se suben solos (`/api/sesion/sync`). Refrescar, ir para atrás o quedarse sin señal no borra nada; los toques responden al instante.
- **Pantalla encendida** durante la sesión y el timer (Wake Lock, con video mudo de respaldo en iPhone). La campana se desbloquea con el primer toque.
- **Cronómetro flotante**: el timer de la bici y el descanso siguen corriendo al cambiar de pantalla; se ven en una pastilla arriba y en una ventanita (Picture-in-Picture) sobre otras apps.
- **Notas de prueba**: los socios anotan errores e ideas desde la sesión o en Perfil → Notas de prueba; la dueña las ve en `/admin/notas`.
- El reto del mes cuenta solo días con al menos una serie hecha; una sesión sin series se puede descartar ("Salir sin guardar").
- Se sacó el aviso "Toca subir el peso"; queda "¿Cómo te resultó el peso?".
- Cerrar la ficha/video vuelve a la sesión en el mismo ejercicio.

## Próximo paso

Publicar novedades, retos y sorteos desde el panel, subir los videos de las máquinas y recuperar la contraseña por email.
