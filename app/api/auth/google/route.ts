import crypto from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { appOrigin as origin, googleEnabled } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Paso 1: mandamos al socio a la pantalla de Google
export async function GET(req: NextRequest) {
  if (!googleEnabled()) return NextResponse.redirect(new URL('/login?error=google-off', req.url));
  const state = crypto.randomBytes(16).toString('hex');
  const next = req.nextUrl.searchParams.get('next') || '/';
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: `${origin(req)}/api/auth/google/callback`,
    response_type: 'code',
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });
  const res = NextResponse.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
  const opts = { httpOnly: true, sameSite: 'lax' as const, secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 600 };
  res.cookies.set('gm_oauth_state', state, opts);
  res.cookies.set('gm_oauth_next', next.startsWith('/') && !next.startsWith('//') ? next : '/', opts);
  return res;
}
