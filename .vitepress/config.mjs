import { defineConfig } from "vitepress";
import { nav } from './config/nav'
import { sidebar } from './config/sidebar'
import { search } from './config/search'
import { meta } from './config/meta'
import { footer } from './config/footer'

export default defineConfig({
  ...meta,
  themeConfig: {
    logo: "https://image.honahec.cc/avatar-circle.png",
    nav,
    sidebar,
    search,
    footer,
    
    socialLinks: [
      { icon: "github", link: "https://github.com/Honahec" }
    ],

    docFooter: {
      prev: "上一页",
      next: "下一页",
    },

    outline: {
      level: [2, 6],
      label: "文章目录",
    },

    lastUpdated: {
      text: "最后更新于",
      formatOptions: {
        dateStyle: "short",
        timeStyle: "short",
      },
    },

    langMenuLabel: "选择语言",
    returnToTopLabel: "返回顶部",
    sidebarMenuLabel: "导航栏",
    darkModeSwitchLabel: "主题",
    lightModeSwitchTitle: "浅色模式",
    darkModeSwitchTitle: "深色模式",
  }
})
