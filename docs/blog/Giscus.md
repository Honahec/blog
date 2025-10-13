---
title: 修复Giscus绑定丢失的问题
createTime: 2025/10/11 21:15:50
permalink: /blog/st6tr7r5/
tags:
  - debug
---

> [!important]
> 本文记录在例如重构文件链接或其它奇奇怪怪总之导致评论消失后如何重新绑定
>
> Giscus 支持绑定 GitHub Discussions 编号来绑定评论

## 用 Frontmatter 驱动 Giscus

在构建阶段读取每篇文章的 frontmatter，如果写了形如 `giscus: 123456` 就自动把 `commentID` 设成该编号并启用 `number` 映射

共需要修改 `config.ts` 和 `client.ts` 两个文件

Giscus 配置保持 mapping 为 pathname 即可

:::code-tabs

@tab config.ts

```ts
plugins: [
    {
        name: "local-giscus-frontmatter",
        extendsPage(page) { // 借助 extendsPage 钩子拿到每个页面的 page.frontmatter
            const frontmatter = page.frontmatter ?? {};

            const giscus = frontmatter.giscus;
            if (giscus === undefined) {
                return;
            }

            if (giscus === false) {
                frontmatter.comment = false;
                delete frontmatter.commentID;
                delete (frontmatter as Record<string, unknown>).commentMapping;
                return;
            } // 顺手集成了关闭评论功能

            if (
                (typeof giscus === "number" && Number.isFinite(giscus)) ||
                (typeof giscus === "string" && giscus.trim() !== "")
            ) {
                frontmatter.comment = true;
                frontmatter.commentID = String(giscus);
                (frontmatter as Record<string, unknown>).commentMapping = "number";
                //手动设置 Giscus 索引 number
            } else {
                delete frontmatter.commentID;
                delete (frontmatter as Record<string, unknown>).commentMapping;
            }
        },
    },
],
```

@tab client.ts

```ts
import { useData } from "vuepress/client";
import {
  defineGiscusConfig,
  useGiscusOptions,
} from "@vuepress/plugin-comment/client";

defineClientConfig({
  setup() {
    const { frontmatter } = useData();
    const globalGiscusOptions = useGiscusOptions();
    const baseOptions = { ...globalGiscusOptions.value };

    defineGiscusConfig(
      computed(() => {
        const mapping = frontmatter.value.commentMapping;
        return {
          ...baseOptions,
          mapping:
            typeof mapping === "string" && mapping.trim()
              ? (mapping as typeof baseOptions.mapping)
              : baseOptions.mapping ?? "pathname",
        };
      })
    );
  },
});
```

:::

==为什么要设置 commentMapping 而不是直接读 giscus?==

### commentMapping 的作用

- VuePress/Plume 的评论插件期望从前端配置里读到标准字段：`comment`、`commentID`、`commentMapping` 等，然后据此初始化 Giscus

- commpentMapping 是我们在构建阶段写进 frontmatter 的中间产物：

  - 当 giscus: 1 时，我们把它翻译成 commentID="1" + commentMapping="number"，让 Giscus 按讨论编号挂钩

  - 当 giscus: false 时，顺手删掉 commentID、commentMapping，并让 comment=false，从而关闭评论
