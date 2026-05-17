import { NextRequest } from 'next/server';
import { isAdminUser } from '../../../../lib/authz';
import {
  listPrivateMarkdownPosts,
  readAccessConfig,
  readPrivateMarkdown,
} from '../../../../lib/github-content';
import { getSession, jsonResponse, optionsResponse } from '../../../../lib/http';

export function OPTIONS(req: NextRequest) {
  return optionsResponse(req);
}

export async function GET(req: NextRequest) {
  const user = getSession(req);
  if (!user || !isAdminUser(user)) {
    return jsonResponse(req, { message: '需要 admin 权限' }, 403);
  }

  try {
    const [{ config }, posts] = await Promise.all([
      readAccessConfig(),
      listPrivateMarkdownPosts(),
    ]);

    const withTitles = await Promise.all(
      posts.map(async (post) => {
        const markdown = await readPrivateMarkdown(post.slug).catch(() => '');
        return {
          ...post,
          title: extractTitle(markdown) ?? post.slug,
          users: config.posts[post.slug] ?? [],
        };
      }),
    );

    return jsonResponse(req, { posts: withTitles });
  } catch (error) {
    return jsonResponse(
      req,
      { message: error instanceof Error ? error.message : '读取文章列表失败' },
      500,
    );
  }
}

function extractTitle(markdown: string | null) {
  if (!markdown) {
    return null;
  }

  const frontmatterTitle = markdown.match(
    /^---\n[\s\S]*?\ntitle:\s*["']?(.+?)["']?\n[\s\S]*?\n---/,
  );
  if (frontmatterTitle?.[1]) {
    return frontmatterTitle[1].trim();
  }

  const heading = markdown.match(/^#\s+(.+)$/m);
  return heading?.[1]?.trim() ?? null;
}
