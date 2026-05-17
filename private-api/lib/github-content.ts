import type {
  AccessConfig,
  GitHubContentEntry,
  GitHubContentFile,
} from './types';

export async function readPrivateMarkdown(slug: string) {
  const basePath = process.env.PRIVATE_CONTENT_PATH ?? 'posts';
  const path = `${basePath.replace(/\/$/, '')}/${slug}.md`;
  const data = await readContentFile(path);

  if (!data) {
    return null;
  }

  if (data.type !== 'file' || typeof data.content !== 'string') {
    return null;
  }

  return Buffer.from(data.content, 'base64').toString('utf8');
}

export async function listPrivateMarkdownPosts() {
  const basePath = process.env.PRIVATE_CONTENT_PATH ?? 'posts';
  const entries = await readContentDirectory(basePath.replace(/\/$/, ''));

  return entries
    .filter((entry) => entry.type === 'file' && entry.name.endsWith('.md'))
    .map((entry) => ({
      slug: entry.name.replace(/\.md$/, ''),
      name: entry.name,
      path: entry.path,
    }))
    .sort((left, right) => left.slug.localeCompare(right.slug));
}

export async function readAccessConfig(): Promise<{
  config: AccessConfig;
  sha: string | null;
}> {
  const path = process.env.PRIVATE_ACCESS_FILE ?? 'access.json';
  const file = await readContentFile(path);

  if (!file) {
    return { config: { posts: {} }, sha: null };
  }

  const raw = Buffer.from(file.content, 'base64').toString('utf8');
  const config = raw.trim()
    ? (JSON.parse(raw) as unknown)
    : ({ posts: {} } satisfies AccessConfig);

  return {
    config: normalizeAccessConfig(config),
    sha: file.sha,
  };
}

export async function writeAccessConfig(config: AccessConfig, sha: string | null) {
  const path = process.env.PRIVATE_ACCESS_FILE ?? 'access.json';
  const normalized = normalizeAccessConfig(config);
  const content = Buffer.from(
    `${JSON.stringify(normalized, null, 2)}\n`,
    'utf8',
  ).toString('base64');

  const body: {
    message: string;
    content: string;
    branch: string;
    sha?: string;
  } = {
    message: `chore(private-access): update ${path}`,
    content,
    branch: process.env.PRIVATE_CONTENT_REF ?? 'main',
  };

  if (sha) {
    body.sha = sha;
  }

  const response = await githubRequest<{ content?: { sha?: string } }>(
    `/contents/${encodeURIComponentPath(path)}`,
    {
      method: 'PUT',
      body: JSON.stringify(body),
    },
  );

  return response.content?.sha ?? null;
}

export async function readContentFile(path: string) {
  return githubRequest<GitHubContentFile | null>(
    `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(
      process.env.PRIVATE_CONTENT_REF ?? 'main',
    )}`,
    { allowNotFound: true },
  );
}

async function readContentDirectory(path: string) {
  const response = await githubRequest<GitHubContentEntry[] | GitHubContentFile | null>(
    `/contents/${encodeURIComponentPath(path)}?ref=${encodeURIComponent(
      process.env.PRIVATE_CONTENT_REF ?? 'main',
    )}`,
    { allowNotFound: true },
  );

  return Array.isArray(response) ? response : [];
}

async function githubRequest<T>(
  path: string,
  options: {
    method?: string;
    body?: BodyInit;
    allowNotFound?: boolean;
  } = {},
): Promise<T> {
  const repo = process.env.PRIVATE_CONTENT_REPO;
  const token = process.env.PRIVATE_CONTENT_GITHUB_TOKEN;

  if (!repo || !token) {
    throw new Error('Private content source is not configured');
  }

  const response = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    method: options.method ?? 'GET',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'private-blog-api',
    },
    body: options.body,
  });

  if (response.status === 404 && options.allowNotFound) {
    return null as T;
  }

  if (!response.ok) {
    throw new Error(`GitHub content request failed: ${response.status}`);
  }

  return (await response.json()) as T;
}

function normalizeAccessConfig(config: unknown): AccessConfig {
  const maybeConfig = config as { posts?: unknown };
  const posts =
    maybeConfig && typeof maybeConfig.posts === 'object' && maybeConfig.posts
      ? (maybeConfig.posts as Record<string, unknown>)
      : {};

  return {
    posts: Object.fromEntries(
      Object.entries(posts).map(([slug, users]) => [
        slug,
        Array.isArray(users)
          ? [...new Set(users.map((user) => String(user).trim()).filter(Boolean))]
          : [],
      ]),
    ),
  };
}

function encodeURIComponentPath(path: string) {
  return path.split('/').map(encodeURIComponent).join('/');
}
