import { defineCollection, defineCollections } from 'vuepress-theme-plume';

const blog = defineCollection({
  type: 'post',
  dir: 'blog',
  title: 'Blog',
  link: '/en/blog/',
  tags: true,
  archives: true,
  categories: false,
});

export default defineCollections([blog]);
