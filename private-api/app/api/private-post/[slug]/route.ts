import { NextRequest } from 'next/server';
import { canReadPost } from '../../../../lib/authz';
import { readPrivateMarkdown } from '../../../../lib/github-content';
import { getSession, jsonResponse, optionsResponse } from '../../../../lib/http';
import { renderPrivateMarkdown } from '../../../../lib/markdown';

const SLUG_PATTERN = /^[a-z0-9][a-z0-9._-]{0,127}$/i;

type Params = {
  params: Promise<{ slug: string }>;
};

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest, { params }: Params) {
  const user = getSession(req);
  if (!user) {
    return jsonResponse(req, { message: '请先使用 GitHub 登录' }, 401);
  }

  const { slug } = await params;
  if (!SLUG_PATTERN.test(slug)) {
    return jsonResponse(req, { message: '文章标识不合法' }, 400);
  }

  try {
    if (!(await canReadPost(user, slug))) {
      return jsonResponse(req, { message: '当前 GitHub 用户无权阅读这篇文章' }, 403);
    }

    const markdown = await readPrivateMarkdown(slug);
    if (!markdown) {
      return jsonResponse(req, { message: '文章不存在' }, 404);
    }

    return jsonResponse(req, { slug, html: renderPrivateMarkdown(markdown) });
  } catch (error) {
    return jsonResponse(
      req,
      { message: error instanceof Error ? error.message : '读取文章失败' },
      500,
    );
  }
}
