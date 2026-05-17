import { NextRequest } from 'next/server';
import { createOAuthState, getGitHubAuthorizeUrl } from '../../../../../lib/github-oauth';
import {
  createOAuthStateCookie,
  jsonResponse,
  optionsResponse,
  redirectResponse,
} from '../../../../../lib/http';

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export function GET(req: NextRequest) {
  const state = createOAuthState();
  const returnTo = req.nextUrl.searchParams.get('return_to') ?? '/admin';

  try {
    return redirectResponse(getGitHubAuthorizeUrl(state, returnTo), [
      createOAuthStateCookie(state),
    ]);
  } catch (error) {
    return jsonResponse(
      req,
      { message: error instanceof Error ? error.message : 'GitHub 登录初始化失败' },
      500,
    );
  }
}
