export const sidebar = {
  "/about/": [
    {
      text: "关于我",
    },
  ],

  "/blog/": [
    {
      text: "Blog",
      link: "/blog/",
      items: [
        {
          text: "项目管理",
          items: [
            { text: "Git", link: "/blog/git.md" },
            { text: "Git对象", link: "/blog/GitObject.md" },
            { text: "pnpm", link: "/blog/pnpm.md" },
          ],
        },
        {
          text: "前端",
          items: [
            { text: "Nginx", link: "/blog/nginx.md" },
          ],
        },
      ],
    },
  ],

  "/friends/": [
    {
      text: "友链",
      link: "/friends/",
    },
    {
      text: "友链申请",
      link: "/friends/apply.md",
    },
  ],

  "/todo/": [
    {
      text: "TODO",
      link: "/todo/",
    },
  ],
};
