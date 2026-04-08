import { NextRequest, NextResponse } from 'next/server';

const AUTH_COOKIE_NAME = 'token';
const ONE_WEEK_SECONDS = 7 * 24 * 60 * 60;

function isProd(): boolean {
  return process.env.NODE_ENV === 'production';
}

function resolveCookieDomain(): string | undefined {
  const value = process.env.AUTH_COOKIE_DOMAIN?.trim();
  return value ? value : undefined;
}

export function setAuthCookie(response: NextResponse, token: string): void {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    maxAge: ONE_WEEK_SECONDS,
    domain: resolveCookieDomain(),
  });
}

export function clearAuthCookie(response: NextResponse): void {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: isProd(),
    sameSite: 'strict',
    path: '/',
    maxAge: 0,
    domain: resolveCookieDomain(),
  });
}

export function getTokenFromRequest(request: NextRequest): string | null {
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  if (cookieToken) {
    return cookieToken;
  }

  const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearerToken = authHeader.slice(7).trim();
    return bearerToken || null;
  }

  return null;
}
