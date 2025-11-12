---
title: 友情链接
# createTime: 2025/10/11 17:40:31
createTime: false
pageLayout: doc
groups:
  - title: 朋友
    list:
      - name: 云朵角落
        avatar: https://image.honahec.cc/avatar.png
        desc: 我自己的blog
        link: https://blog.honahec.cc
      - name: Modenc
        avatar: https://modenc.top/avatar.jpg
        desc: 喜欢钻研各种新奇的东西
        link: https://modenc.top
      - name: 异想之旅
        avatar: https://blog.yxzl.dev/head.png
        desc: 异想之旅のBlog
        link: https://blog.yxzl.dev/
      - name: Iron_Grey_
        avatar: https://irongrey.top/headphoto.png
        desc: Iron_Grey_的首页
        link: https://IronGrey.top/
  - title: 项目
    list:
      - name: QA瓜田
        desc: 快凉了的高中论坛
        link: https://qaguatian.com/
        avatar: https://qaguatian.com/assets/logo-single-bNTGBFEX.svg
      - name: Plume 主题
        desc: 一个简约易用的，功能丰富的 vuepress 文档&博客 主题
        link: https://theme-plume.vuejs.press/
        avatar: https://theme-plume.vuejs.press/plume.png

permalink: /friends/
giscus: 2
copyright: false
readingTime: false
changelog: false
externalLinkIcon: false
aside: false
---

<script setup>
import { computed } from 'vue'
import { useData } from 'vuepress/client'

const { frontmatter } = useData()

const getListByTitle = (title) => {
  return frontmatter.value?.groups?.find((group) => group.title === title)?.list ?? []
}

const friends = computed(() => getListByTitle('朋友'))
const projects = computed(() => getListByTitle('项目'))
</script>

<section v-if="friends.length" class="friends-section">
  <h2 class="friends-section-title">朋友</h2>
  <div class="friends-wrapper">
    <div v-for="friend in friends" :key="friend.link" class="friend-card">
      <a :href="friend.link" target="_blank" rel="noopener noreferrer">
        <img :src="friend.avatar" :alt="friend.name" class="friend-avatar">
        <div class="friend-info">
          <h3>{{ friend.name }}</h3>
          <p>{{ friend.desc }}</p>
        </div>
      </a>
    </div>
  </div>
</section>

---

<section v-if="projects.length" class="friends-section">
  <h2 class="friends-section-title">项目</h2>
  <div class="friends-wrapper">
    <div v-for="project in projects" :key="project.link" class="friend-card">
      <a :href="project.link" target="_blank" rel="noopener noreferrer">
        <img :src="project.avatar" :alt="project.name" class="friend-avatar">
        <div class="friend-info">
          <h3>{{ project.name }}</h3>
          <p>{{ project.desc }}</p>
        </div>
      </a>
    </div>
  </div>
</section>

---

如果你想交换友链，可以在你的网站添加本站后选择

- 在下方评论区留言

- 在 GitHub 中提交 `Pull Request`

留言格式：

```markdown
name: 网站名称
avatar: 头像链接
desc: 网站描述
link: 网站链接
```

本站信息：

```markdown
name: 云朵角落
avatar: https://image.honahec.cc/avatar.png
desc: Honahec's Blog
link: https://blog.honahec.cc
```

我会在看到留言或 PR 后尽快添加友链

<style scoped>
.friends-wrapper {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  padding: 20px 0;
}

.friend-card {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  transition: all 0.3s;
}

.friend-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.friend-card a {
  display: flex;
  padding: 16px;
  text-decoration: none;
  color: inherit;
}

.friend-avatar {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  margin-right: 16px;
}

.friend-info h3 {
  margin: 0 0 8px;
  font-size: 16px;
}

.friend-info p {
  margin: 0;
  font-size: 14px;
  color: var(--vp-c-text-2);
}

.friends-section + .friends-section {
  margin-top: 40px;
}

.friends-section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
}

.friends-section-title + .friends-wrapper {
  margin-top: 16px;
}
</style>
