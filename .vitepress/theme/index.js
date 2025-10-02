// https://vitepress.dev/guide/custom-theme
import { h } from "vue";
import DefaultTheme from "vitepress/theme";
import "viewerjs/dist/viewer.css";
import { onMounted, watch, nextTick } from "vue";
import { useRoute } from "vitepress";
import { Icon } from "@iconify/vue";

import "./theme-enhanced.css";
import "./style.css";

import GiscusComment from "./components/GiscusComment.vue";
import RandomTagline from "./components/RandomTagline.vue";
import FeaturedPosts from "./components/FeaturedPosts.vue";
import EducationTimeline from "./components/EducationTimeline.vue";
import { initImageViewer } from "./utils/viewer";

/** @type {import('vitepress').Theme} */
export default {
  extends: DefaultTheme,

  // 图片放大
  setup() {
    const route = useRoute();
    let viewer = null; // 保存viewer实例

    const initZoom = () => {
      // 如果已存在实例，先销毁
      if (viewer) {
        viewer.destroy();
      }

      // 创建一个容器实例，而不是为每张图片创建实例
      const container = document.querySelector(".main");
      viewer = initImageViewer(container);
    };

    onMounted(() => {
      initZoom();
    });

    watch(
      () => route.path,
      () => {
        nextTick(() => {
          initZoom();
        });
      }
    );
  },

  Layout: () => {
    return h(DefaultTheme.Layout, null, {
      // https://vitepress.dev/guide/extending-default-theme#layout-slots
      "home-hero-info-after": () => h(RandomTagline),
      "doc-after": () => h(GiscusComment),
      "home-features-after": () => h(FeaturedPosts),
    });
  },
  enhanceApp({ app }) {
    app.component("Icon", Icon);
    app.component("EducationTimeline", EducationTimeline);
  },
};
