import { NextRequest } from 'next/server';
import { isAdminUser } from '../../../../lib/authz';
import { readAccessConfig, writeAccessConfig } from '../../../../lib/github-content';
import { getSession, jsonResponse, optionsResponse } from '../../../../lib/http';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const user = getSession(req);
  if (!user || !isAdminUser(user)) {
    return jsonResponse(req, { message: '需要 admin 权限' }, 403);
  }

  const slug = req.nextUrl.searchParams.get('slug') ?? '';
  if (!SLUG_PATTERN.test(slug)) {
    return jsonResponse(req, { message: '文章标识不合法' }, 400);
  }

  const { config } = await readAccessConfig();
  return jsonResponse(req, { slug, users: config.posts[slug] ?? [] });
}

export async function PUT(req: NextRequest) {
  const user = getSession(req);
  if (!user || !isAdminUser(user)) {
    return jsonResponse(req, { message: '需要 admin 权限' }, 403);
  }

  const body = (await req.json().catch(() => null)) as {
    slug?: unknown;
    users?: unknown;
  } | null;
  const slug = typeof body?.slug === 'string' ? body.slug : '';
  const users = Array.isArray(body?.users) ? body.users : null;

  if (!SLUG_PATTERN.test(slug) || !users) {
    return jsonResponse(req, { message: '请求内容不合法' }, 400);
  }

  const normalizedUsers = [
    ...new Set(
      users
        .map((item) => String(item).trim())
        .filter(Boolean)
        .map((item) => item.replace(/^@/, '')),
    ),
  ];

  const { config, sha } = await readAccessConfig();
  config.posts[slug] = normalizedUsers;
  await writeAccessConfig(config, sha);

  return jsonResponse(req, { slug, users: normalizedUsers });
}
