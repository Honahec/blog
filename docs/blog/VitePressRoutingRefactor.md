---
title: Vitepress 博客链接重构
createTime: 2025/10/10 19:32:56
permalink: /blog/nqcft02d/
tags:
  - 前端
---

## 初衷：隐藏原始文章路径

博客原来的文章路径都是类似 `/blog/git` 这样的明文文件名，我们期望其对外链接看起来像 `/blog/dsafopdf`，并保证静态站点构建、导航、站内引用、外部地址全部兼容

目标拆分出来大概是：

- 生成稳定的 8 位小写字母 slug，并把 slug 和原始 markdown 文件对应起来
- 让 VitePress 知道这些“虚拟”路径——开发时要能访问，构建时也要产出对应的 HTML
- 所有配置（导航、侧边栏、精选文章等）都不能再写死原始路径
- 主机上的真实 URL 要统一带末尾 `/`

## 生成 slug & 配置 rewrites

第一步在 `.vitepress/config/blogSlugs.mjs` 里扫描 `src/blog`，对所有非 index.md 的文章使用 `sha256` 生成 8 位小写字符 slug，并导出：

- blogSlugMap：原始文件名到 slug

```js
const blogSlugMap = Object.fromEntries(
  blogEntries.map((entry) => [entry.baseName, entry.slug])
);
```

- blogRewrites：`blog/<文件>` → `blog/<slug>/index.md`，交给 VitePress 的 rewrites

```js
const blogRewrites = Object.fromEntries(
  blogEntries.map((entry) => [
    entry.relativePath,
    `blog/${entry.slug}/index.md`,
  ])
);
```

- blogAliasEntries：在 Vite 的 resolve.alias 里把虚拟路径映射回真实文件，确保热更新工作正常

```js
const blogAliasEntries = blogEntries.flatMap((entry) => {
  const replacement = path.join(SRC_DIR, entry.relativePath);
  return [
    {
      find: path.join(SRC_DIR, "blog", entry.slug, "index.md"),
      replacement,
    },
    {
      find: path.join(SRC_DIR, "blog", `${entry.slug}.md`),
      replacement,
    },
  ];
});
```

- 帮助函数 resolveBlogLink / withTrailingSlash：方便在配置文件里复用

```js
function resolveBlogLink(baseName) {
  const normalized = baseName.replace(/^\//, "").replace(/\.md$/, "");
  const slug = blogSlugMap[normalized];
  return `/blog/${slug ?? normalized}/`;
}

function withTrailingSlash(pathname) {
  if (!pathname) return pathname;
  return pathname.endsWith("/") ? pathname : `${pathname}/`;
}
```

这样访问 /blog/kjrbhsvq/ 的时候，请求会被重写到实际的 blog/git.md，构建时也会输出 dist/blog/kjrbhsvq/index.html。

## 主题与配置跟上 hashed 路径

接下来逐个替换所有硬编码的文章链接：

- 导航 (nav.js)、侧边栏 (sidebar.js) 与精选文章 (featuredPosts.js) 均使用 `resolveBlogLink`
- 主题组件需要使用 `__BLOG_SLUG_MAP__`（通过 vite.define 注入），在客户端也能读到 slug

```js
const blogSlugMap =
  typeof __BLOG_SLUG_MAP__ === "undefined" ? {} : __BLOG_SLUG_MAP__;
```

- `transformPageData` 给每篇文章自动补上 frontmatter.permalink，并将 relativePath 指到新的虚拟目录，以便路由和 404 检查保持一致

```js
transformPageData(pageData) {
    const filePath = pageData.filePath;
    if (!filePath) return;

    if (filePath.startsWith("blog/")) {
        const baseName = filePath.replace(/^blog\//, "").replace(/\.md$/, "");
        if (blogSlugMap[baseName]) {
        const permalink = withTrailingSlash(`/blog/${blogSlugMap[baseName]}`);
        return {
            frontmatter: {
            ...pageData.frontmatter,
            permalink,
            },
            relativePath: `blog/${blogSlugMap[baseName]}/index.md`,
        };
        }
    }

    if (
        !filePath.endsWith("index.md") &&
        !filePath.endsWith("README.md") &&
        !pageData.frontmatter?.permalink
    ) {
        const normalized = filePath.replace(/\.md$/, "");
        const permalink = withTrailingSlash(`/${normalized}`);
        return {
        frontmatter: {
            ...pageData.frontmatter,
            permalink,
        },
        relativePath: `${normalized}/index.md`,
        };
    }
}
```

这也让许可信息组件 LicenseNotice.vue 可以通过 page.filePath 判断是不是普通文章

## Canonical URL 与尾随斜杠

为了避免 /blog/abc 和 /blog/abc/ 混用，我们把 cleanUrls 设置为 "with-subfolders"，同时让 transformPageData 生成的 permalink 全部带 `/` 结尾。最终构建产物也是 index.html，外链使用时不会再被反复重定向

## Markdown 内部链接重写

处理完外部配置后，还有一个隐患：文章正文里常见的例如 `./GitObject.md` 链接。由于实际产物路径变成了 `/blog/iftjzdbk/`，原始相对路径就会 404

为此给 markdown pipeline 加一个小插件（同样写在 `config.mjs`）：

1. 在解析阶段遍历 `link_open` token
2. 如果 href 指向 `blog/*.md`、`*.md` 或者一个不含 `/` 的词条，就尝试用 blogSlugMap 替换
3. 保留原来的查询参数、hash
4. 最终把链接改写成 `/blog/<slug>/`

```js
markdown: {
    config(md) {
        md.core.ruler.after("inline", "blog-slug-links", (state) => {
        const env = state.env || {};
        const currentDir = env.relativePath
            ? path.posix.dirname(env.relativePath)
            : "";

        for (const token of state.tokens) {
            if (token.type !== "inline" || !token.children) continue;

            for (const child of token.children) {
            if (child.type !== "link_open" || !child.attrs) continue;
            const hrefAttr = child.attrs.find(([name]) => name === "href");
            if (!hrefAttr) continue;

            const rewritten = rewriteBlogHref(hrefAttr[1], currentDir);
            if (rewritten) {
                hrefAttr[1] = rewritten;
            }
            }
        }
        });
    },
}
```

VitePress 的死链检查也能检测到这一层 rewrites，内文跳转全部恢复正常

## LicenseNotice 的小修复

把 `relativePath` 替换成虚拟目录后，LicenseNotice 一开始拿不到文章真正的归属路径，导致整个区块不再显示。

换用 `page.filePath`（构建时 VitePress 会保留原始 markdown 路径）之后就恢复了

```diff
- const relative = page.value?.relativePath || ""
- if (!relative.startsWith("blog/")) return false
+ const filePath = page.value?.filePath || ""
+ if (!filePath.startsWith("blog/")) return false
```

## 结果

最终所有文章都隐藏了真实文件名，同时保持：

- 主题、导航、内文引用全部使用统一的 slug
- 尾随斜杠规范化
- LicenseNotice、精选文章、侧边栏等模块在 hashed 路径下正常工作
- Markdown 内文不需要手动改写链接
