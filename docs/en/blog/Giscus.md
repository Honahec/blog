---
title: Fixing Giscus Binding Loss Issue
createTime: 2025/10/11 21:15:50
permalink: /en/blog/st6tr7r5/
tags:
  - debug
---

> [!important]
> This article documents how to rebind comments after they disappear due to file link refactoring or other strange reasons
>
> Giscus supports binding GitHub Discussions numbers to link comments

## Driving Giscus with Frontmatter

During the build phase, read each article's frontmatter. If it contains something like `giscus: 123456`, automatically set `commentID` to that number and enable `number` mapping

Two files need to be modified: `config.ts` and `client.ts`

Keep the Giscus configuration mapping as pathname

:::code-tabs

@tab config.ts

```ts
plugins: [
    {
        name: "local-giscus-frontmatter",
        extendsPage(page) { // Use extendsPage hook to get each page's page.frontmatter
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
            } // Also integrated comment disabling functionality

            if (
                (typeof giscus === "number" && Number.isFinite(giscus)) ||
                (typeof giscus === "string" && giscus.trim() !== "")
            ) {
                frontmatter.comment = true;
                frontmatter.commentID = String(giscus);
                (frontmatter as Record<string, unknown>).commentMapping = "number";
                //Manually set Giscus index number
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
import { useData } from 'vuepress/client';
import {
  defineGiscusConfig,
  useGiscusOptions,
} from '@vuepress/plugin-comment/client';

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
            typeof mapping === 'string' && mapping.trim()
              ? (mapping as typeof baseOptions.mapping)
              : (baseOptions.mapping ?? 'pathname'),
        };
      }),
    );
  },
});
```

:::

==Why set commentMapping instead of reading giscus directly?==

### The Role of commentMapping

- VuePress/Plume's comment plugin expects to read standard fields from the frontend configuration: `comment`, `commentID`, `commentMapping`, etc., and then initializes Giscus accordingly

- commentMapping is an intermediate product we write into frontmatter during the build phase:
  - When giscus: 1, we translate it to commentID="1" + commentMapping="number", making Giscus hook by discussion number

  - When giscus: false, we conveniently delete commentID and commentMapping, and set comment=false to disable comments
