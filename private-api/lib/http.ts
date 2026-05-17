import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { GitHubUser } from './types';

const SESSION_COOKIE = 'private_blog_session';
const OAUTH_STATE_COOKIE = 'private_blog_oauth_state';

export function corsHeaders(req: NextRequest) {
  const origin = req.headers.get('origin');
  const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const headers = new Headers({
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET,POST,PUT,OPTIONS',
    'Cache-Control': 'no-store',
  });

  if (origin && allowedOrigins.includes(origin)) {
    headers.set('Access-Control-Allow-Origin', origin);
    headers.set('Vary', 'Origin');
  }

  return headers;
}

export function optionsResponse(req: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders(req),
  });
}

export function jsonResponse(req: NextRequest, body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(req),
  });
}

export function redirectResponse(location: string, cookies: string[] = []) {
  const response = NextResponse.redirect(location);
  for (const cookie of cookies) {
    response.headers.append('Set-Cookie', cookie);
  }
  return response;
}

export function createSessionCookie(user: GitHubUser, maxAgeSeconds: number) {
  const expires = Math.floor(Date.now() / 1000) + maxAgeSeconds;
  const payload = Buffer.from(
    JSON.stringify({
      expires,
      user: {
        id: user.id,
        login: user.login,
        name: user.name ?? null,
        avatarUrl: user.avatarUrl ?? null,
        admin: Boolean(user.admin),
      },
    }),
  ).toString('base64url');
  const signature = sign(payload);

  return makeCookie(SESSION_COOKIE, `${payload}.${signature}`, maxAgeSeconds);
}

export function clearSessionCookie() {
  return makeCookie(SESSION_COOKIE, '', 0);
}

export function createOAuthStateCookie(state: string) {
  return makeCookie(OAUTH_STATE_COOKIE, state, 600);
}

export function clearOAuthStateCookie() {
  return makeCookie(OAUTH_STATE_COOKIE, '', 0);
}

export function getOAuthState(req: NextRequest) {
  return req.cookies.get(OAUTH_STATE_COOKIE)?.value ?? '';
}

export function getSession(req: NextRequest): GitHubUser | null {
  const value = req.cookies.get(SESSION_COOKIE)?.value;
  if (!value) {
    return null;
  }

  const [payload, signature] = value.split('.');
  if (!payload || !signature || !timingSafeEqual(signature, sign(payload))) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      expires?: number;
      user?: GitHubUser;
    };

    if (!Number.isFinite(data.expires) || Number(data.expires) <= Date.now() / 1000) {
      return null;
    }

    if (!data.user || typeof data.user.login !== 'string') {
      return null;
    }

    return data.user;
  } catch {
    return null;
  }
}

function makeCookie(name: string, value: string, maxAgeSeconds: number) {
  const domain = process.env.COOKIE_DOMAIN
    ? `; Domain=${process.env.COOKIE_DOMAIN}`
    : '';

  return [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    `SameSite=${process.env.COOKIE_SAME_SITE ?? 'Lax'}`,
    domain,
  ]
    .filter(Boolean)
    .join('; ');
}

function sign(payload: string) {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }

  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function timingSafeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(String(left));
  const rightBuffer = Buffer.from(String(right));

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}
