import { computed } from 'vue';
import { defineClientConfig, useData } from 'vuepress/client';
import {
  defineGiscusConfig,
  useGiscusOptions,
} from '@vuepress/plugin-comment/client';
// import RepoCard from 'vuepress-theme-plume/features/RepoCard.vue'
// import NpmBadge from 'vuepress-theme-plume/features/NpmBadge.vue'
// import NpmBadgeGroup from 'vuepress-theme-plume/features/NpmBadgeGroup.vue'
// import Swiper from 'vuepress-theme-plume/features/Swiper.vue'

// import CustomComponent from './theme/components/Custom.vue'

import Homepage from './components/Homepage.vue';
import EducationTimeLine from './components/EducationTimeLine.vue';
import RandomTagline from './components/RandomTagline.vue';

//@ts-ignore
import './style.scss';

export default defineClientConfig({
  enhance({ app }) {
    // built-in components
    // app.component('RepoCard', RepoCard)
    // app.component('NpmBadge', NpmBadge)
    // app.component('NpmBadgeGroup', NpmBadgeGroup)
    // app.component('Swiper', Swiper) // you should install `swiper`
    // your custom components
    // app.component('CustomComponent', CustomComponent)
    app.component('Homepage', Homepage);
    app.component('EducationTimeLine', EducationTimeLine);
    app.component('RandomTagline', RandomTagline);
  },
  setup() {
    const { frontmatter } = useData();
    const globalGiscusOptions = useGiscusOptions();

    defineGiscusConfig(
      computed(() => {
        const baseOptions = { ...globalGiscusOptions.value };
        const mapping = frontmatter.value.commentMapping;
        // Use frontmatter-provided mapping (from config.ts extendsPage) when set.
        if (typeof mapping === 'string' && mapping.trim()) {
          return {
            ...baseOptions,
            mapping: mapping as typeof baseOptions.mapping,
            ...(mapping === 'specific' ? { strict: false } : {}),
          };
        }

        return baseOptions;
      }),
    );

    // 动态注入一言到 hero text
    // const updateYiyan = async () => {
    //   const isHomePage = route.path === "/";

    //   if (isHomePage) {
    //     try {
    //       const response = await fetch("https://api.honahec.cc/yiyan/get/");
    //       const data = await response.json();
    //       const yiyan = data.author ? `${data.content} —— ${data.author}` : data.content;

    //       await new Promise(resolve => setTimeout(resolve, 100));

    //       const element = document.getElementsByClassName('hero-text')[0];
    //       if (element) {
    //         element.innerHTML = yiyan;
    //       }
    //     } catch (error) {
    //       console.error("获取一言失败：", error);
    //     }
    //   }
    // };

    // onMounted(updateYiyan);

    // watch(() => route.path, updateYiyan);
  },
});
