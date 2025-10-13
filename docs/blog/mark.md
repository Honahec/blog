---
title: 为 VuePress Plume 主题添加马克笔懒加载效果
createTime: 2025/10/12 23:27:01
permalink: /blog/g1d2bxy4/
tags:
  - 前端
---

> 本文记录我第一次提交 Pull Request 并被 merge 的经历

![](https://image.honahec.cc/pr.png)

## 需求背景

`==mark==` 原本的描线动画在页面刷新时会直接播放，无法做到「到达可视区后再出现」（个人认为这可以极大提升观感和马克笔效果的意义）。

目标是在主题内部实现懒加载动画，同时保留原有的语法解析。

## 核心实现

:::tabs

@tab mark.ts

`setupMarkHighlight` 负责把懒加载逻辑完全放在客户端，细节如下：

- **IntersectionObserver**
  - 观察 `.vp-doc mark`，第一次进入视口时给元素打上 `vp-mark-visible`，然后取消观察，保证动画只播放一次。
- **MutationObserver**
  - 监听 `.vp-doc` 节点树的新增子节点，覆盖路由切换、异步渲染、刷新后首屏等场景，触发重新绑定。
- **调度策略**
  - 首屏 `mounted` 时、`onContentUpdated`、`router.afterEach` 都会调度一次扫描。
  - 使用 `requestAnimationFrame` 合并重复调用，并在卸载时清理所有 observer 和 hook。
- **模式开关**
  - 根据传入的 `mode` 给 `<html>` 设置或清除 `data-mark-mode="lazy"`，不用改原有模板即可切换动画风格。

```ts :collapsed-lines
import { onBeforeUnmount, onMounted } from "vue";
import { onContentUpdated, useRouter } from "vuepress/client";

// data-mark-mode=lazy 控制是否启用懒加载动画
const MARK_MODE_ATTR = "data-mark-mode";
const MARK_MODE_LAZY = "lazy";
// 当 mark 节点进入视口后，添加该类名触发真正的描线动画
const MARK_VISIBLE_CLASS = "vp-mark-visible";
// 防止重复 observe 的标记属性
const MARK_BOUND_ATTR = "data-vp-mark-bound";
// 只扫描文档区域的 mark，规避导航等区域的误触发
const MARK_SELECTOR = ".vp-doc mark";
const DOC_SELECTOR = ".vp-doc";
// 用于重置：被标记但尚未触发动画的节点
const BOUND_SELECTOR = `${MARK_SELECTOR}[${MARK_BOUND_ATTR}="1"]`;

export function setupMarkHighlight(mode: "lazy" | "eager"): void {
  if (typeof window === "undefined" || __VUEPRESS_SSR__) return;

  const root = document.documentElement;

  // 直接加载模式：直接移除 data-mark-mode，保持旧行为
  if (mode !== MARK_MODE_LAZY) {
    root.removeAttribute(MARK_MODE_ATTR);
    return;
  }

  // 懒加载模式：标记 html，CSS 会禁用默认动画
  root.setAttribute(MARK_MODE_ATTR, MARK_MODE_LAZY);

  let intersectionObserver: IntersectionObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let rafId: number | null = null;
  let removeAfterEach: (() => void) | null = null;

  // 保证观察器全局复用；threshold/rootMargin 控制进入视口后何时触发
  const ensureObserver = () => {
    if (!intersectionObserver) {
      intersectionObserver = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            // intersectionRatio > 0 表示已进入视口
            if (!entry.isIntersecting && entry.intersectionRatio <= 0) continue;

            const target = entry.target as HTMLElement;
            target.classList.add(MARK_VISIBLE_CLASS);
            target.removeAttribute(MARK_BOUND_ATTR);
            obs.unobserve(target); // 防止重复触发
          }
        },
        {
          threshold: [0, 0.1, 0.25, 0.5], // 提前观察，避免快速滚动漏判
          rootMargin: "8% 0px -8% 0px", // 上下留缓冲区
        }
      );
    }
    return intersectionObserver;
  };

  // 收集需要观察的 mark，并为其打上 data-vp-mark-bound
  const bindMarks = () => {
    const marks = Array.from(
      document.querySelectorAll<HTMLElement>(MARK_SELECTOR)
    ).filter(
      (mark) =>
        mark instanceof HTMLElement &&
        !mark.classList.contains(MARK_VISIBLE_CLASS) && // 已播放过动画的不需要
        mark.getAttribute(MARK_BOUND_ATTR) !== "1" // 避免重复绑定
    );

    if (marks.length === 0) return;

    const observer = ensureObserver();
    for (const mark of marks) {
      mark.setAttribute(MARK_BOUND_ATTR, "1");
      observer.observe(mark);
    }
  };

  // 统一调度绑定，使用 requestAnimationFrame 去除重复调用
  const scheduleBind = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      rafId = null;
      bindMarks();
    });
  };

  // 监听文档区域 DOM 变更，保证动态内容也能绑定
  const observeDocMutations = () => {
    const doc = document.querySelector(DOC_SELECTOR);
    if (!doc) return;

    if (mutationObserver) mutationObserver.disconnect();

    mutationObserver = new MutationObserver((mutations) => {
      // 只要有节点新增，就重新扫描 mark
      if (mutations.some((mutation) => mutation.addedNodes.length > 0))
        scheduleBind();
    });
    mutationObserver.observe(doc, { childList: true, subtree: true });
  };

  // route 切换时，需要重置已绑定但未触发的 mark，并断开观察器
  const resetObserver = () => {
    document.querySelectorAll<HTMLElement>(BOUND_SELECTOR).forEach((mark) => {
      if (!mark.classList.contains(MARK_VISIBLE_CLASS))
        mark.removeAttribute(MARK_BOUND_ATTR);
    });

    if (intersectionObserver) {
      intersectionObserver.disconnect();
      intersectionObserver = null;
    }
  };

  const router = useRouter();

  // 首次挂载：绑定现有 mark，并监听后续变更
  onMounted(() => {
    observeDocMutations();
    scheduleBind();
  });

  // Markdown 内容更新（SSR 刷新、动态渲染）时重新绑定
  onContentUpdated(() => {
    resetObserver();
    observeDocMutations();
    scheduleBind();
  });

  // 路由切换后，需要重新扫描页面内容
  if (router?.afterEach) {
    removeAfterEach = router.afterEach(() => {
      resetObserver();
      observeDocMutations();
      scheduleBind();
    });
  }

  // 等待路由就绪（初次进入 SPA）后再跑一遍，防止 race condition
  if (router?.isReady) {
    router
      .isReady()
      .then(() => scheduleBind())
      .catch(() => {});
  }

  // 组件销毁时释放资源
  onBeforeUnmount(() => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    resetObserver();
    mutationObserver?.disconnect();
    mutationObserver = null;
    removeAfterEach?.();
    removeAfterEach = null;
  });
}
```

@tab mark.css

`mark.css` 的关键点在于动态控制 `--vp-mark-animation`：

- 默认情况下保留原先的 `mark-highlight` 动画。
- 当根节点带上 `data-mark-mode="lazy"` 时，将 `--vp-mark-animation`置为 none ，让 `<mark>` 静止。
- 被 `setupMarkHighlight` 标记为 `vp-mark-visible` 后，重新赋值动画，1.5s 的描线才会触发。
- 其它部分维持之前的渐变、配色变量和响应式自定义。

```css
mark {
  ...
  animation: var(
    --vp-mark-animation,
    mark-highlight 1.5s 0.5s forwards
  ); /* 默认立即播放动画 */
}

/* 懒加载：禁用默认动画，等待 JS 添加 vp-mark-visible */
[data-mark-mode="lazy"] mark {
  --vp-mark-animation: none;
}

/* 被 JS 标记后重新启用描线动画，延迟稍微提前，让视觉更自然 */
[data-mark-mode="lazy"] mark.vp-mark-visible {
  animation: mark-highlight 1.5s 0.2s forwards;
}
```

:::

## 其它必要调整

- `MarkdownPowerPluginOptions` 引入 `mark?: 'eager' | 'lazy'`，默认值保持 `eager`，不影响更新版本的用户。
- `prepareConfigFile.ts` 中沿用原本的 `setupIcon` 组织方式，新增 `setupMarkHighlight(markMode)`；通过构建 `setupStmts` 先收集图标初始化，再附加懒加载初始化，最终统一注入到客户端 `setup()` 钩子。
- `tsdown.config.mjs` 新增 `mark.ts` 到客户端构建配置，确保发布包里包含新的组合式函数。
