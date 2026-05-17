'use client';

import { useEffect, useMemo, useState } from 'react';

type User = {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string | null;
  admin: boolean;
};

type Post = {
  slug: string;
  name: string;
  path: string;
  title: string;
  users: string[];
};

export default function AdminPage() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [savingSlug, setSavingSlug] = useState('');
  const [error, setError] = useState('');

  const isAdmin = Boolean(user?.admin);

  useEffect(() => {
    void boot();
  }, []);

  async function boot() {
    setLoading(true);
    setError('');

    try {
      const me = await request<{ user: User }>('/api/auth/me');
      setUser(me.user);

      if (me.user.admin) {
        const data = await request<{ posts: Post[] }>('/api/admin/posts');
        setPosts(data.posts);
        setDrafts(
          Object.fromEntries(
            data.posts.map((post) => [post.slug, post.users.join('\n')]),
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载失败');
    } finally {
      setLoading(false);
    }
  }

  function login() {
    window.location.href = `/api/auth/github/login?return_to=${encodeURIComponent('/admin')}`;
  }

  async function logout() {
    await fetch('/api/auth/logout', {
      method: 'POST',
      credentials: 'include',
    });
    setUser(null);
    setPosts([]);
    setDrafts({});
  }

  async function save(slug: string) {
    setSavingSlug(slug);
    setError('');

    try {
      const users = parseUsers(drafts[slug] ?? '');
      const data = await request<{ slug: string; users: string[] }>(
        '/api/admin/access',
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug, users }),
        },
      );

      setPosts((current) =>
        current.map((post) =>
          post.slug === slug ? { ...post, users: data.users } : post,
        ),
      );
      setDrafts((current) => ({ ...current, [slug]: data.users.join('\n') }));
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSavingSlug('');
    }
  }

  const visibleCount = useMemo(
    () => posts.filter((post) => post.users.length > 0).length,
    [posts],
  );

  return (
    <main className="admin-shell">
      <header className="admin-header">
        <div>
          <p className="eyebrow">Private Blog</p>
          <h1>文章访问管理</h1>
        </div>
        <div className="header-actions">
          {user ? (
            <>
              <span className="user-pill">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" /> : null}
                {user.login}
              </span>
              <button className="button secondary" onClick={logout}>
                退出
              </button>
            </>
          ) : (
            <button className="button" onClick={login}>
              GitHub 登录
            </button>
          )}
        </div>
      </header>

      {loading ? <p className="status">正在加载...</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {!loading && !user ? (
        <section className="empty-state">
          <h2>需要 GitHub 登录</h2>
          <p>登录后会检查你的账号是否在 admin 名单中。</p>
          <button className="button" onClick={login}>
            使用 GitHub 登录
          </button>
        </section>
      ) : null}

      {!loading && user && !isAdmin ? (
        <section className="empty-state">
          <h2>当前账号不是 admin</h2>
          <p>请在 Vercel 环境变量 ADMIN_GITHUB_USERS 中加入 {user.login}。</p>
        </section>
      ) : null}

      {!loading && isAdmin ? (
        <>
          <section className="summary-grid">
            <div>
              <span>私有文章</span>
              <strong>{posts.length}</strong>
            </div>
            <div>
              <span>已配置可见名单</span>
              <strong>{visibleCount}</strong>
            </div>
          </section>

          <section className="post-list">
            {posts.map((post) => (
              <article className="post-row" key={post.slug}>
                <div className="post-meta">
                  <h2>{post.title}</h2>
                  <p>{post.slug}</p>
                </div>
                <label className="users-editor">
                  <span>可见 GitHub 用户名</span>
                  <textarea
                    value={drafts[post.slug] ?? ''}
                    placeholder={'Honahec\nfriend-login'}
                    onChange={(event) =>
                      setDrafts((current) => ({
                        ...current,
                        [post.slug]: event.target.value,
                      }))
                    }
                  />
                </label>
                <button
                  className="button"
                  disabled={savingSlug === post.slug}
                  onClick={() => void save(post.slug)}
                >
                  {savingSlug === post.slug ? '保存中' : '保存'}
                </button>
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: 'include',
  });

  const data = (await response.json().catch(() => null)) as
    | { message?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : `请求失败：${response.status}`;

    throw new Error(message);
  }

  return data as T;
}

function parseUsers(value: string) {
  return [
    ...new Set(
      value
        .split(/[\n,]/)
        .map((item) => item.trim().replace(/^@/, ''))
        .filter(Boolean),
    ),
  ];
}
