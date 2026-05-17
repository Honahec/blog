import { NextRequest } from 'next/server';
import {
  clearOAuthStateCookie,
  clearSessionCookie,
  jsonResponse,
  optionsResponse,
} from '../../../../lib/http';

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export function POST(req: NextRequest) {
  const response = jsonResponse(req, { ok: true });
  response.headers.append('Set-Cookie', clearSessionCookie());
  response.headers.append('Set-Cookie', clearOAuthStateCookie());
  return response;
}
