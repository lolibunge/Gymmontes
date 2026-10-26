import { NextResponse, type NextRequest } from 'next/server';
import { appOrigin as origin, COOKIE, googleEnabled, sign } from '@/lib/auth';
import { one } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Paso 2: Google vuelve con un código; lo cambiamos por los datos del socio
export async function GET(req: NextRequest) {
  const fail = () => NextResponse.redirect(new URL('/login?error=google', req.url));
  if (!googleEnabled()) return fail();
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('gm_oauth_state')?.value) return fail();

  try {
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        redirect_uri: `${origin(req)}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });
    const tokens = await tokenRes.json();
    if (!tokens.access_token) return fail();
    const info = await (await fetch('https://openidconnect.googleapis.com/v1/userinfo', { headers: { Authorization: `Bearer ${tokens.access_token}` } })).json();
    if (!info.email || info.email_verified === false) return fail();
    const email = String(info.email).toLowerCase();
    let user = await one<{ id: number }>('select id from users where email = $1', [email]);
    if (!user) {
      user = await one<{ id: number }>(
        `insert into users (name, email, pin_hash, auth_provider) values ($1,$2,'','google') returning id`,
        [info.given_name || info.name || email.split('@')[0], email]
      );
    }
    const next = req.cookies.get('gm_oauth_next')?.value || '/';
    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.set(COOKIE, sign(user!.id), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 60 * 60 * 24 * 180 });
    res.cookies.delete('gm_oauth_state');
    res.cookies.delete('gm_oauth_next');
    return res;
  } catch (e) {
    console.error('[google]', e);
    return fail();
  }
}
