# VitePress 博客

基于 VitePress 构建的个人博客项目，支持文章管理、评论系统、友链和搜索功能。

## 主要特性

- 基于 VitePress 静态站点生成器
- 集成 Giscus 评论系统
- 本地全文搜索
- 图片预览和缩放
- 深色/浅色主题切换
- 友链管理系统
- 一言 API 集成
- 移动端适配

## 目录结构

```
├── .vitepress/           VitePress 配置目录
│   ├── config.mjs        主配置文件
│   ├── cache/            构建缓存目录
│   ├── config/           配置模块
│   │   ├── nav.js        导航栏配置
│   │   ├── sidebar.js    侧边栏配置
│   │   ├── search.js     搜索配置
│   │   ├── footer.js     页脚配置
│   │   └── meta.js       SEO 元信息
│   └── theme/            主题相关
│       ├── index.js      主题入口文件
│       ├── style.css     自定义样式
│       ├── theme-enhanced.css  增强样式
│       ├── components/   Vue 组件
│       │   ├── GiscusComment.vue     评论组件
│       │   ├── FeaturedPosts.vue     推荐文章
│       │   ├── RandomTagline.vue     一言
│       │   └── EducationTimeline.vue 教育时间线
│       ├── data/         数据文件
│       │   ├── friends.js        友链数据
│       │   └── featuredPosts.js  推荐文章数据
│       └── utils/        工具函数
│           └── viewer.js         图片预览工具
├── src/                  内容目录
│   ├── ...
│   └── index.md          首页
├── .gitignore            Git 忽略配置
├── .gitattributes        Git 属性配置
├── .npmrc                npm 配置
├── package.json          项目配置
└── pnpm-lock.yaml        依赖锁定文件
```

## 环境要求

- Node.js 16.x 或更高版本
- pnpm 8.x 或更高版本

## 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/Honahec/blog.git
cd blog
```

### 2. 安装依赖

```bash
pnpm install
```

### 3. 启动开发服务器

```bash
pnpm docs:dev
```

访问 http://localhost:5173 查看开发环境

### 4. 构建生产版本

```bash
pnpm docs:build
```

构建产物输出到 `dist` 目录


## 功能说明

### 内容管理
- Markdown 文章编写
- 自动生成文章目录
- 代码语法高亮
- 图片点击预览

### 交互功能  
- Giscus 评论系统（基于 GitHub Discussions）
- 本地全文搜索
- 深色/浅色主题切换
- 友链展示和申请

### 其他特性
- 一言 API 随机语句
- 响应式布局适配
- SEO 友好的 URL 结构

## 配置说明

### 站点基本配置
修改 `.vitepress/config.mjs` 中的站点信息：

```javascript
export default defineConfig({
  title: '站点标题',
  description: '站点描述',
  // 其他配置...
})
```

### 导航栏配置
编辑 `.vitepress/config/nav.js` 添加或修改导航项

### 侧边栏配置  
编辑 `.vitepress/config/sidebar.js` 配置文章分类和排序

### 主题样式
在 `.vitepress/theme/style.css` 中自定义 CSS 样式

### 评论系统配置
1. 在 GitHub 仓库中启用 Discussions 功能
2. 配置 Giscus 应用
3. 修改配置文件中的相关参数