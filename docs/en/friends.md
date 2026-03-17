---
title: Friends
# createTime: 2025/10/11 17:40:31
createTime: false
pageLayout: doc
groups:
  - title: Friends
    list:
      - name: 云朵角落
        avatar: https://image.honahec.cc/avatar.png
        desc: My own blog
        link: https://blog.honahec.cc
      - name: Modenc
        avatar: https://modenc.top/avatar.jpg
        desc: Enjoys exploring all kinds of novel things
        link: https://modenc.top
      - name: 异想之旅
        avatar: https://yxzl.dev/head.png
        desc: 异想之旅's Blog
        link: https://yxzl.dev/
      - name: Iron_Grey_
        avatar: https://irongrey.top/headphoto.png
        desc: Iron_Grey_'s Homepage
        link: https://IronGrey.top/
  - title: Projects
    list:
      - name: QA瓜田
        desc: A high school forum that's almost inactive
        link: https://qaguatian.com/
        avatar: https://qaguatian.com/assets/logo-single-bNTGBFEX.svg
      - name: Plume Theme
        desc: A simple, easy-to-use, feature-rich vuepress documentation & blog theme
        link: https://theme-plume.vuejs.press/
        avatar: https://theme-plume.vuejs.press/plume.png

permalink: /en/friends/
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

const friends = computed(() => getListByTitle('Friends'))
const projects = computed(() => getListByTitle('Projects'))
</script>

<section v-if="friends.length" class="friends-section">
  <h2 class="friends-section-title">Friends</h2>
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
  <h2 class="friends-section-title">Projects</h2>
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

If you'd like to exchange friend links, you can add this site to your website first and then choose to:

- Leave a message in the comment section below

- Submit a `Pull Request` on GitHub

Message format:

```markdown
name: Website Name
avatar: Avatar Link
desc: Website Description
link: Website Link
```

This site's information:

```markdown
name: 云朵角落
avatar: https://image.honahec.cc/avatar.png
desc: Honahec's Blog
link: https://blog.honahec.cc
```

I will add the friend link as soon as I see your message or PR

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