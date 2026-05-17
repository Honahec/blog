import { NextRequest } from 'next/server';
import {
  decodeOAuthState,
  exchangeCodeForGitHubUser,
} from '../../../../../lib/github-oauth';
import {
  clearOAuthStateCookie,
  createSessionCookie,
  getOAuthState,
  jsonResponse,
  redirectResponse,
} from '../../../../../lib/http';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code') ?? '';
  const stateValue = req.nextUrl.searchParams.get('state') ?? '';
  const decodedState = decodeOAuthState(stateValue);

  if (!code || !decodedState || decodedState.state !== getOAuthState(req)) {
    return jsonResponse(req, { message: 'GitHub OAuth state 校验失败' }, 400);
  }

  try {
    const user = await exchangeCodeForGitHubUser(code);
    const maxAgeSeconds = Number(process.env.SESSION_MAX_AGE_SECONDS ?? 604800);
    return redirectResponse(decodedState.returnTo, [
      clearOAuthStateCookie(),
      createSessionCookie(user, maxAgeSeconds),
    ]);
  } catch (error) {
    return jsonResponse(
      req,
      { message: error instanceof Error ? error.message : 'GitHub 登录失败' },
      500,
    );
  }
}
