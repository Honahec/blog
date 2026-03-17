---
title: Adding Lazy Loading Effect for Marker Highlights in VuePress Plume Theme
createTime: 2025/10/12 23:27:01
permalink: /en/blog/g1d2bxy4/
tags:
  - Frontend
---

> This article documents my first experience submitting a Pull Request that got merged

![](https://image.honahec.cc/pr.png)

## Background

The original `==mark==` stroke animation would play immediately on page refresh, unable to achieve "appear only after reaching the viewport" (I personally believe this can greatly enhance the visual experience and the significance of the marker effect).

The goal is to implement lazy loading animation within the theme while preserving the original syntax parsing.

## Core Implementation

:::tabs

@tab mark.ts

`setupMarkHighlight` is responsible for placing the lazy loading logic entirely on the client side, with the following details:

- **IntersectionObserver**
  - Observes `.vp-doc mark`, adds `vp-mark-visible` to the element when it first enters the viewport, then stops observing to ensure the animation plays only once.
- **MutationObserver**
  - Monitors new child nodes in the `.vp-doc` node tree, covering scenarios like route switching, async rendering, and first screen after refresh, triggering rebinding.
- **Scheduling Strategy**
  - Schedules a scan on first screen `mounted`, `onContentUpdated`, and `router.afterEach`.
  - Uses `requestAnimationFrame` to merge duplicate calls and cleans up all observers and hooks on unmount.
- **Mode Switch**
  - Sets or clears `data-mark-mode="lazy"` on `<html>` based on the passed `mode`, allowing animation style switching without modifying the original template.

```ts :collapsed-lines
import { onBeforeUnmount, onMounted } from "vue";
import { onContentUpdated, useRouter } from "vuepress/client";

// data-mark-mode=lazy controls whether to enable lazy loading animation
const MARK_MODE_ATTR = "data-mark-mode";
const MARK_MODE_LAZY = "lazy";
// When mark node enters viewport, add this class to trigger the actual stroke animation
const MARK_VISIBLE_CLASS = "vp-mark-visible";
// Marker attribute to prevent duplicate observation
const MARK_BOUND_ATTR = "data-vp-mark-bound";
// Only scan marks in document area to avoid false triggers in navigation, etc.
const MARK_SELECTOR = ".vp-doc mark";
const DOC_SELECTOR = ".vp-doc";
// For reset: nodes that are marked but haven't triggered animation yet
const BOUND_SELECTOR = `${MARK_SELECTOR}[${MARK_BOUND_ATTR}="1"]`;

export function setupMarkHighlight(mode: "lazy" | "eager"): void {
  if (typeof window === "undefined" || __VUEPRESS_SSR__) return;

  const root = document.documentElement;

  // Direct loading mode: remove data-mark-mode to maintain old behavior
  if (mode !== MARK_MODE_LAZY) {
    root.removeAttribute(MARK_MODE_ATTR);
    return;
  }

  // Lazy loading mode: mark html, CSS will disable default animation
  root.setAttribute(MARK_MODE_ATTR, MARK_MODE_LAZY);

  let intersectionObserver: IntersectionObserver | null = null;
  let mutationObserver: MutationObserver | null = null;
  let rafId: number | null = null;
  let removeAfterEach: (() => void) | null = null;

  // Ensure observer is globally reused; threshold/rootMargin controls when to trigger after entering viewport
  const ensureObserver = () => {
    if (!intersectionObserver) {
      intersectionObserver = new IntersectionObserver(
        (entries, obs) => {
          for (const entry of entries) {
            // intersectionRatio > 0 indicates entered viewport
            if (!entry.isIntersecting && entry.intersectionRatio <= 0) continue;

            const target = entry.target as HTMLElement;
            target.classList.add(MARK_VISIBLE_CLASS);
            target.removeAttribute(MARK_BOUND_ATTR);
            obs.unobserve(target); // Prevent duplicate triggers
          }
        },
        {
          threshold: [0, 0.1, 0.25, 0.5], // Observe early to avoid missing fast scrolls
          rootMargin: "8% 0px -8% 0px", // Leave buffer zones top and bottom
        }
      );
    }
    return intersectionObserver;
  };

  // Collect marks that need observation and mark them with data-vp-mark-bound
  const bindMarks = () => {
    const marks = Array.from(
      document.querySelectorAll<HTMLElement>(MARK_SELECTOR)
    ).filter(
      (mark) =>
        mark instanceof HTMLElement &&
        !mark.classList.contains(MARK_VISIBLE_CLASS) && // No need for already animated ones
        mark.getAttribute(MARK_BOUND_ATTR) !== "1" // Avoid duplicate binding
    );

    if (marks.length === 0) return;

    const observer = ensureObserver();
    for (const mark of marks) {
      mark.setAttribute(MARK_BOUND_ATTR, "1");
      observer.observe(mark);
    }
  };

  // Unified scheduling for binding, using requestAnimationFrame to eliminate duplicate calls
  const scheduleBind = () => {
    if (rafId !== null) cancelAnimationFrame(rafId);

    rafId = requestAnimationFrame(() => {
      rafId = null;
      bindMarks();
    });
  };

  // Monitor DOM changes in document area to ensure dynamic content can also be bound
  const observeDocMutations = () => {
    const doc = document.querySelector(DOC_SELECTOR);
    if (!doc) return;

    if (mutationObserver) mutationObserver.disconnect();

    mutationObserver = new MutationObserver((mutations) => {
      // Rescan marks whenever nodes are added
      if (mutations.some((mutation) => mutation.addedNodes.length > 0))
        scheduleBind();
    });
    mutationObserver.observe(doc, { childList: true, subtree: true });
  };

  // On route switch, need to reset bound but untriggered marks and disconnect observer
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

  // First mount: bind existing marks and monitor subsequent changes
  onMounted(() => {
    observeDocMutations();
    scheduleBind();
  });

  // Rebind when Markdown content updates (SSR refresh, dynamic rendering)
  onContentUpdated(() => {
    resetObserver();
    observeDocMutations();
    scheduleBind();
  });

  // After route switch, need to rescan page content
  if (router?.afterEach) {
    removeAfterEach = router.afterEach(() => {
      resetObserver();
      observeDocMutations();
      scheduleBind();
    });
  }

  // Wait for router ready (first SPA entry) then run again to prevent race condition
  if (router?.isReady) {
    router
      .isReady()
      .then(() => scheduleBind())
      .catch(() => {});
  }

  // Release resources on component unmount
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

The key point in `mark.css` is dynamically controlling `--vp-mark-animation`:

- By default, preserve the original `mark-highlight` animation.
- When the root node has `data-mark-mode="lazy"`, set `--vp-mark-animation` to none, keeping `<mark>` static.
- After being marked as `vp-mark-visible` by `setupMarkHighlight`, reassign the animation, triggering the 1.5s stroke.
- Other parts maintain the previous gradients, color variables, and responsive customization.

```css
mark {
  ...
  animation: var(
    --vp-mark-animation,
    mark-highlight 1.5s 0.5s forwards
  ); /* Play animation immediately by default */
}

/* Lazy loading: disable default animation, wait for JS to add vp-mark-visible */
[data-mark-mode="lazy"] mark {
  --vp-mark-animation: none;
}

/* Re-enable stroke animation after JS marking, delay slightly earlier for more natural visuals */
[data-mark-mode="lazy"] mark.vp-mark-visible {
  animation: mark-highlight 1.5s 0.2s forwards;
}
```

:::
## Other Necessary Adjustments

- Introduce `mark?: 'eager' | 'lazy'` to `MarkdownPowerPluginOptions`, with default value kept as `eager`, not affecting users updating to the new version.
- In `prepareConfigFile.ts`, follow the original `setupIcon` organization approach and add `setupMarkHighlight(markMode)`; build `setupStmts` to first collect icon initialization, then append lazy loading initialization, and finally inject them uniformly into the client `setup()` hook.
- Add `mark.ts` to the client build configuration in `tsdown.config.mjs` to ensure the new composable is included in the published package.