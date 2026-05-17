# Private Blog API

这个目录是一个独立的 Vercel / Next.js 项目，用来给公开 VuePress 博客提供私密文章正文和管理后台。

私密 Markdown 不放在公开博客仓库里。新建一个私有 GitHub 仓库，例如 `Honahec/private-blog-content`，目录结构如下：

```text
access.json
posts/
  example-private-post.md
```

`access.json` 由后台自动创建和更新，格式如下：

```json
{
  "posts": {
    "example-private-post": ["Honahec", "friend-login"]
  }
}
```

在 Vercel 创建新项目时，把 Root Directory 设为 `private-api`，并配置这些环境变量：

```text
ADMIN_GITHUB_USERS=Honahec
ALLOWED_ORIGINS=https://blog.honahec.cc,http://localhost:8080
ALLOWED_RETURN_ORIGINS=https://blog.honahec.cc,https://private-api.honahec.cc,http://localhost:8080,http://localhost:3000
COOKIE_DOMAIN=.honahec.cc
DEFAULT_RETURN_TO=/admin
GITHUB_OAUTH_CALLBACK_URL=https://private-api.honahec.cc/api/auth/github/callback
GITHUB_OAUTH_CLIENT_ID=GitHub OAuth App Client ID
GITHUB_OAUTH_CLIENT_SECRET=GitHub OAuth App Client Secret
PRIVATE_ACCESS_FILE=access.json
PRIVATE_CONTENT_GITHUB_TOKEN=GitHub fine-grained token，给私有内容仓库 Contents Read and write
PRIVATE_CONTENT_REPO=Honahec/private-blog-content
PRIVATE_CONTENT_REF=main
PRIVATE_CONTENT_PATH=posts
SESSION_SECRET=替换成随机长字符串
```

GitHub OAuth App 配置：

```text
Homepage URL: https://private-api.honahec.cc
Authorization callback URL: https://private-api.honahec.cc/api/auth/github/callback
```

部署后，给 Vercel 项目绑定自定义域名，例如 `private-api.honahec.cc`。

管理后台：

```text
https://private-api.honahec.cc/admin
```

博客仓库里使用：

```md
<PrivatePost slug="example-private-post" api-base="https://private-api.honahec.cc" />
```

本地开发时可以在博客根目录新建 `.env.local`：

```text
VITE_PRIVATE_API_BASE=https://private-api.honahec.cc
```

然后 Markdown 里可以省略 `api-base`：

```md
<PrivatePost slug="example-private-post" />
```
