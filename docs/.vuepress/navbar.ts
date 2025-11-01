/**
 * @see https://theme-plume.vuejs.press/config/navigation/ 查看文档了解配置详情
 *
 * Navbar 配置文件，它在 `.vuepress/plume.config.ts` 中被导入。
 */

import { defineNavbarConfig } from "vuepress-theme-plume";

export default defineNavbarConfig([
  { text: "首页", link: "/", icon: "fe:home" },
  { text: "关于我", link: "/about/", icon: "fe:info" },
  { text: "博客", link: "/blog/", icon: "fe:document" },
  { text: "标签", link: "/blog/tags/", icon: "fe:tag" },
  { text: "友链", link: "/friends/", icon: "fe:users" },
  { text: "我的主页", link: "https://honahec.cc/"}
]);
