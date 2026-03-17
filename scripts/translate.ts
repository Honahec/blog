import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface TranslateConfig {
  baseUrl: string;
  apiKey: string;
  model?: string;
  sourceDir: string;
  targetDir: string;
  cacheDir: string;
}

interface TranslationCache {
  [filePath: string]: {
    hash: string;
    translatedPath: string;
    timestamp: number;
  };
}

class BlogTranslator {
  private config: TranslateConfig;
  private cache: TranslationCache = {};
  private cacheFile: string;
  private client: Anthropic;

  constructor(config: TranslateConfig) {
    this.config = {
      model: 'claude-sonnet-4-6',
      ...config,
    };
    this.cacheFile = path.join(this.config.cacheDir, 'translation-cache.json');
    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      baseURL: this.config.baseUrl,
    });
    this.loadCache();
  }

  private loadCache() {
    try {
      if (fs.existsSync(this.cacheFile)) {
        this.cache = JSON.parse(fs.readFileSync(this.cacheFile, 'utf-8'));
      }
    } catch (error) {
      console.warn('Failed to load cache:', error);
      this.cache = {};
    }
  }

  private saveCache() {
    try {
      fs.mkdirSync(this.config.cacheDir, { recursive: true });
      fs.writeFileSync(this.cacheFile, JSON.stringify(this.cache, null, 2));
    } catch (error) {
      console.error('Failed to save cache:', error);
    }
  }

  private getFileHash(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  private async callClaudeAPI(content: string): Promise<string> {
    const message = await this.client.messages.create({
      model: this.config.model!,
      max_tokens: 8000,
      messages: [
        {
          role: 'user',
          content: `Please translate the following Chinese markdown document to English.

IMPORTANT RULES:
1. Keep ALL frontmatter (YAML between ---) UNCHANGED, but translate the content inside if it's in Chinese. If the frontmatter contains non-Chinese text, keep it as is.
2. Keep ALL code blocks UNCHANGED
3. Keep ALL URLs and links UNCHANGED
4. Translate only the main content text
5. Preserve markdown formatting (headers, lists, bold, italic, etc.)
6. Keep technical terms accurate
7. Maintain natural English flow
8. Do NOT add any explanations or comments, only return the translated markdown content
9. Translate the title, tags, etc. in the frontmatter if they are in Chinese

Here's the document:

${content}`,
        },
      ],
    });

    return message.content[0].type === 'text' ? message.content[0].text : '';
  }

  private needsTranslation(filePath: string, content: string): boolean {
    const hash = this.getFileHash(content);
    const cached = this.cache[filePath];

    if (!cached) return true;
    if (cached.hash !== hash) return true;
    if (!fs.existsSync(cached.translatedPath)) return true;

    return false;
  }

  async translateFile(sourceFile: string): Promise<void> {
    const relativePath = path.relative(this.config.sourceDir, sourceFile);
    const targetFile = path.join(this.config.targetDir, relativePath);

    console.log(`Processing: ${relativePath}`);

    const content = fs.readFileSync(sourceFile, 'utf-8');

    if (!this.needsTranslation(sourceFile, content)) {
      console.log(`  ✓ Skipped (unchanged)`);
      return;
    }

    console.log(`  → Translating...`);

    try {
      const translated = await this.callClaudeAPI(content);

      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, translated, 'utf-8');

      this.cache[sourceFile] = {
        hash: this.getFileHash(content),
        translatedPath: targetFile,
        timestamp: Date.now(),
      };

      console.log(`  ✓ Translated successfully`);
    } catch (error) {
      console.error(`  ✗ Translation failed:`, error);
      throw error;
    }
  }

  async translateAll(): Promise<void> {
    const files = this.getAllMarkdownFiles(this.config.sourceDir);

    console.log(`Found ${files.length} markdown files\n`);

    for (const file of files) {
      await this.translateFile(file);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    this.saveCache();
    console.log(`\n✓ Translation completed!`);
  }

  private getAllMarkdownFiles(dir: string): string[] {
    const files: string[] = [];

    const items = fs.readdirSync(dir);

    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = fs.statSync(fullPath);

      if (stat.isDirectory()) {
        if (item === '.vuepress' || item === 'node_modules' || item === 'en') {
          continue;
        }
        files.push(...this.getAllMarkdownFiles(fullPath));
      } else if (item.endsWith('.md')) {
        files.push(fullPath);
      }
    }

    return files;
  }
}

async function main() {
  const baseUrl = process.env.CLAUDE_BASE_URL;
  const apiKey = process.env.CLAUDE_API_KEY;

  if (!baseUrl || !apiKey) {
    console.error('Error: CLAUDE_BASE_URL and CLAUDE_API_KEY must be set');
    console.error('\nUsage:');
    console.error(
      '  CLAUDE_BASE_URL=https://api.anthropic.com CLAUDE_API_KEY=your-key pnpm translate',
    );
    process.exit(1);
  }

  const docsDir = path.join(__dirname, '../docs');
  const translator = new BlogTranslator({
    baseUrl,
    apiKey,
    sourceDir: docsDir,
    targetDir: path.join(docsDir, 'en'),
    cacheDir: path.join(__dirname, '../.cache'),
  });

  await translator.translateAll();
}

main().catch(console.error);
