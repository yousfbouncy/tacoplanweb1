import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { ADMIN_COOKIE_NAME, createAdminToken, getAdminPassword } from '@/lib/admin-auth';

function safeEqual(a: string, b: string): boolean {
  const aa = Uint8Array.from(Buffer.from(a));
  const bb = Uint8Array.from(Buffer.from(b));
  if (aa.length !== bb.length) return false;
  return crypto.timingSafeEqual(aa, bb);
}

export async function POST(req: Request) {
  const configuredPassword = getAdminPassword();
  if (!configuredPassword) {
    return NextResponse.json(
      { ok: false, error: 'Admin password not configured' },
      { status: 500 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }

  const password = (body as { password?: unknown })?.password;
  if (typeof password !== 'string') {
    return NextResponse.json({ ok: false, error: 'Password required' }, { status: 400 });
  }

  if (!safeEqual(password, configuredPassword)) {
    return NextResponse.json({ ok: false, error: 'Contraseña incorrecta' }, { status: 401 });
  }

  const cookieSecret =
    process.env.TACOPLAN_ADMIN_COOKIE_SECRET?.trim() || configuredPassword;

  const token = createAdminToken(cookieSecret);
  const res = NextResponse.json({ ok: true });
  res.headers.set('Cache-Control', 'no-store');
  res.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}
