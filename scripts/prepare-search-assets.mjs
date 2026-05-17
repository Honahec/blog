import { readFile, writeFile } from 'node:fs/promises';

const distDir = new URL('../docs/.vuepress/dist/', import.meta.url);
const sitemapUrl = new URL('sitemap.xml', distDir);
const googleSitemapUrl = new URL('sitemap-google.xml', distDir);
const robotsUrl = new URL('robots.txt', distDir);

const sitemap = await readFile(sitemapUrl, 'utf8');
const googleSitemap = sitemap
  .replace(/<\?xml-stylesheet[^?]*\?>\n?/u, '')
  .replace(
    /<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9"[^>]*>/u,
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
  );

await writeFile(googleSitemapUrl, googleSitemap, 'utf8');
await writeFile(
  robotsUrl,
  [
    'User-agent: *',
    'Allow: /',
    '',
    'Sitemap: https://blog.honahec.cc/sitemap-google.xml',
    'Sitemap: https://blog.honahec.cc/sitemap.xml',
    '',
  ].join('\n'),
  'utf8',
);
