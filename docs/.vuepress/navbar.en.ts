/**
 * English Navbar Configuration
 */

import { defineNavbarConfig } from 'vuepress-theme-plume';

export default defineNavbarConfig([
  { text: 'Home', link: '/en/', icon: 'fe:home' },
  { text: 'About', link: '/en/about/', icon: 'fe:info' },
  { text: 'Blog', link: '/en/blog/', icon: 'fe:document' },
  { text: 'Tags', link: '/en/blog/tags/', icon: 'fe:tag' },
  { text: 'Friends', link: '/en/friends/', icon: 'fe:users' },
  {
    text: 'Tools',
    items: [
      {
        text: 'Shared Clipboard',
        link: 'https://clip.honahec.cc/',
        icon: 'fluent:clipboard-12-regular',
      },
    ],
    icon: 'mingcute:tool-line',
  },
  { text: 'My Homepage', link: 'https://honahec.cc/' },
]);
