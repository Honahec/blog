import crypto from 'node:crypto';
import { isAdminUser } from './authz';
import type { GitHubUser } from './types';

export function createOAuthState() {
  return crypto.randomBytes(24).toString('base64url');
}

export function getGitHubAuthorizeUrl(state: string, returnTo: string) {
  const clientId = requireEnv('GITHUB_OAUTH_CLIENT_ID');
  const callbackUrl = requireEnv('GITHUB_OAUTH_CALLBACK_URL');
  const url = new URL('https://github.com/login/oauth/authorize');

  url.searchParams.set('client_id', clientId);
  url.searchParams.set('redirect_uri', callbackUrl);
  url.searchParams.set('scope', 'read:user');
  url.searchParams.set('state', encodeState({ state, returnTo }));

  return url.toString();
}

export function decodeOAuthState(value: string) {
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as {
      state?: unknown;
      returnTo?: unknown;
    };

    if (typeof parsed.state !== 'string') {
      return null;
    }

    return {
      state: parsed.state,
      returnTo: sanitizeReturnTo(parsed.returnTo),
    };
  } catch {
    return null;
  }
}

export async function exchangeCodeForGitHubUser(code: string): Promise<GitHubUser> {
  const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'private-blog-api',
    },
    body: JSON.stringify({
      client_id: requireEnv('GITHUB_OAUTH_CLIENT_ID'),
      client_secret: requireEnv('GITHUB_OAUTH_CLIENT_SECRET'),
      code,
      redirect_uri: requireEnv('GITHUB_OAUTH_CALLBACK_URL'),
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`GitHub token request failed: ${tokenResponse.status}`);
  }

  const tokenData = (await tokenResponse.json()) as {
    access_token?: string;
    error_description?: string;
  };

  if (!tokenData.access_token) {
    throw new Error(tokenData.error_description ?? 'GitHub did not return an access token');
  }

  const userResponse = await fetch('https://api.github.com/user', {
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${tokenData.access_token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'private-blog-api',
    },
  });

  if (!userResponse.ok) {
    throw new Error(`GitHub user request failed: ${userResponse.status}`);
  }

  const user = (await userResponse.json()) as {
    id: number;
    login: string;
    name: string | null;
    avatar_url: string | null;
  };

  return {
    id: user.id,
    login: user.login,
    name: user.name,
    avatarUrl: user.avatar_url,
    admin: isAdminUser(user),
  };
}

function encodeState(payload: { state: string; returnTo: string }) {
  return Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
}

function sanitizeReturnTo(value: unknown) {
  if (typeof value !== 'string' || !value) {
    return process.env.DEFAULT_RETURN_TO ?? '/admin';
  }

  const allowedOrigins = (
    process.env.ALLOWED_RETURN_ORIGINS ??
    process.env.ALLOWED_ORIGINS ??
    ''
  )
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (value.startsWith('/')) {
    return value;
  }

  try {
    const url = new URL(value);
    return allowedOrigins.includes(url.origin)
      ? url.toString()
      : process.env.DEFAULT_RETURN_TO ?? '/admin';
  } catch {
    return process.env.DEFAULT_RETURN_TO ?? '/admin';
  }
}

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
