import { computed } from "vue";
import { defineClientConfig, useData } from "vuepress/client";
import {
  defineGiscusConfig,
  useGiscusOptions,
} from "@vuepress/plugin-comment/client";
// import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue'
// import NpmBadge from 'vuepress-theme-plume/features/NpmBadge.vue'
// import NpmBadgeGroup from 'vuepress-theme-plume/features/NpmBadgeGroup.vue'
// import Swiper from 'vuepress-theme-plume/features/Swiper.vue'

// import CustomComponent from './theme/components/Custom.vue'

import Homepage from "./components/Homepage.vue";
import EducationTimeLine from "./components/EducationTimeLine.vue";
import RandomTagline from "./components/RandomTagline.vue";

//@ts-ignore
import "./style.scss";

export default defineClientConfig({
  enhance({ app }) {
    // built-in components
    // app.component('RepoCard', RepoCard)
    // app.component('NpmBadge', NpmBadge)
    // app.component('NpmBadgeGroup', NpmBadgeGroup)
    // app.component('Swiper', Swiper) // you should install `swiper`
    // your custom components
    // app.component('CustomComponent', CustomComponent)
    app.component("Homepage", Homepage);
    app.component("EducationTimeLine", EducationTimeLine);
    app.component("RandomTagline", RandomTagline);
  },
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
