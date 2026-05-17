import MarkdownIt from 'markdown-it';
import sanitizeHtml from 'sanitize-html';

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function renderPrivateMarkdown(source: string) {
  const rawHtml = markdown.render(stripFrontmatter(source));

  return sanitizeHtml(rawHtml, {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat([
      'img',
      'details',
      'summary',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
    ]),
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel'],
      code: ['class'],
      pre: ['class'],
      img: ['src', 'alt', 'title', 'width', 'height', 'loading'],
      th: ['align'],
      td: ['align'],
      '*': ['id'],
    },
    allowedSchemes: ['http', 'https', 'mailto'],
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', {
        rel: 'nofollow noopener noreferrer',
        target: '_blank',
      }),
      img: sanitizeHtml.simpleTransform('img', {
        loading: 'lazy',
      }),
    },
  });
}

function stripFrontmatter(source: string) {
  return source.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}
