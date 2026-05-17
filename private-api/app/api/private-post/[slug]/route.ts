import { NextRequest } from 'next/server';
import { marked } from 'marked';
import sanitizeHtml from 'sanitize-html';
import { canReadPost } from '../../../../lib/authz';
import { readPrivateMarkdown } from '../../../../lib/github-content';
import { getSession, jsonResponse, optionsResponse } from '../../../../lib/http';

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

    const rawHtml = await marked.parse(markdown, {
      async: false,
      gfm: true,
      breaks: false,
    });

    const html = sanitizeHtml(rawHtml, {
      allowedTags: sanitizeHtml.defaults.allowedTags.concat([
        'img',
        'h1',
        'h2',
        'span',
        'details',
        'summary',
      ]),
      allowedAttributes: {
        a: ['href', 'name', 'target', 'rel'],
        code: ['class'],
        pre: ['class'],
        img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
        '*': ['id'],
      },
      transformTags: {
        a: sanitizeHtml.simpleTransform('a', {
          rel: 'nofollow noopener noreferrer',
          target: '_blank',
        }),
        img: sanitizeHtml.simpleTransform('img', {
          loading: 'lazy',
        }),
      },
    });

    return jsonResponse(req, { slug, html });
  } catch (error) {
    return jsonResponse(
      req,
      { message: error instanceof Error ? error.message : '读取文章失败' },
      500,
    );
  }
}
