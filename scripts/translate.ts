import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

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
      timeout: 600000, // 10 minutes for long articles
      maxRetries: 0, // We handle retries ourselves
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

  private splitIntoChunks(content: string): string[] {
    const lines = content.split('\n');

    // If content is short enough, return as single chunk
    if (lines.length < 150) {
      return [content];
    }

    const chunks: string[] = [];
    let currentChunk: string[] = [];
    let frontmatter: string[] = [];
    let inFrontmatter = false;
    let frontmatterEnd = 0;
    let currentCodeBlockCount = 0;

    // Extract frontmatter first
    for (let i = 0; i < lines.length; i++) {
      if (i === 0 && lines[i].trim() === '---') {
        inFrontmatter = true;
        frontmatter.push(lines[i]);
      } else if (inFrontmatter && lines[i].trim() === '---') {
        frontmatter.push(lines[i]);
        frontmatterEnd = i + 1;
        break;
      } else if (inFrontmatter) {
        frontmatter.push(lines[i]);
      }
    }

    // Split content by code block count (max 8 code blocks per chunk)
    let inCodeBlock = false;
    const MAX_CODE_BLOCKS_PER_CHUNK = 8;

    for (let i = frontmatterEnd; i < lines.length; i++) {
      const line = lines[i];

      // Track code blocks
      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock;
        currentCodeBlockCount++;
      }

      currentChunk.push(line);

      // Split when we have enough code blocks and we're not inside a code block
      // Prefer to split on headers for better context, but force split if too many blocks
      const shouldSplit =
        !inCodeBlock &&
        currentCodeBlockCount >= MAX_CODE_BLOCKS_PER_CHUNK &&
        currentChunk.length > 40 &&
        (/^#{1,3}\s/.test(line) ||
          currentCodeBlockCount >= MAX_CODE_BLOCKS_PER_CHUNK + 4);

      if (shouldSplit) {
        chunks.push(currentChunk.join('\n'));
        currentChunk = [];
        currentCodeBlockCount = 0;
      }
    }

    // Add the last chunk
    if (currentChunk.length > 0) {
      chunks.push(currentChunk.join('\n'));
    }

    // Verify each chunk has balanced code blocks
    const validChunks: string[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const codeBlockCount = (chunk.match(/```/g) || []).length;

      if (codeBlockCount % 2 !== 0) {
        // Unbalanced code blocks, merge with previous chunk
        if (validChunks.length > 0) {
          validChunks[validChunks.length - 1] += '\n' + chunk;
        } else {
          validChunks.push(chunk);
        }
      } else {
        validChunks.push(chunk);
      }
    }

    // Final verification: ensure all chunks have balanced code blocks
    for (let i = 0; i < validChunks.length; i++) {
      const codeBlockCount = (validChunks[i].match(/```/g) || []).length;
      if (codeBlockCount % 2 !== 0) {
        console.log(
          `Warning: Chunk ${i + 1} has unbalanced code blocks, merging all chunks`,
        );
        return [content];
      }
    }

    // If we only got one chunk or no chunks, return original content
    if (validChunks.length <= 1) {
      return [content];
    }

    // Add frontmatter to first chunk
    if (frontmatter.length > 0) {
      validChunks[0] = frontmatter.join('\n') + '\n' + validChunks[0];
    }

    // Log chunk statistics
    console.log(
      `  → Chunk code block counts: ${validChunks.map((c) => (c.match(/```/g) || []).length).join(', ')}`,
    );

    return validChunks;
  }

  private async translateChunk(
    chunk: string,
    chunkIndex: number,
    totalChunks: number,
  ): Promise<string> {
    const contextNote =
      totalChunks > 1
        ? `\n\nNote: This is part ${chunkIndex + 1} of ${totalChunks} of a longer document. Translate this section while maintaining consistency.`
        : '';

    const translated = await this.callClaudeAPI(chunk, contextNote);

    // For the first chunk, update permalink in frontmatter to add /en/ prefix
    if (chunkIndex === 0 && translated.includes('permalink:')) {
      return translated.replace(
        /permalink:\s*(\/(?!en\/)[^\n]+)/,
        (_match, path) => `permalink: /en${path}`,
      );
    }

    return translated;
  }

  private validateTranslation(
    original: string,
    translated: string,
    isChunked = false,
  ): boolean {
    // Check if translation is empty or too short
    if (!translated || translated.trim().length < 50) {
      console.log('Translation too short or empty');
      return false;
    }

    // Count structural elements in both documents
    const countMatches = (text: string, pattern: RegExp): number => {
      return (text.match(pattern) || []).length;
    };

    const originalCodeBlocks = countMatches(original, /```/g);
    const translatedCodeBlocks = countMatches(translated, /```/g);

    const originalHeaders = countMatches(original, /^#{1,6}\s/gm);
    const translatedHeaders = countMatches(translated, /^#{1,6}\s/gm);

    // Code blocks must match (they should not be translated)
    if (originalCodeBlocks !== translatedCodeBlocks) {
      console.log(
        `Code block count mismatch: original=${originalCodeBlocks}, translated=${translatedCodeBlocks}`,
      );
      // For chunked translations, be more lenient as API might truncate
      // If more than 20% of code blocks are missing, it's likely incomplete
      if (isChunked) {
        const missingRatio =
          Math.abs(originalCodeBlocks - translatedCodeBlocks) /
          originalCodeBlocks;
        if (missingRatio > 0.2) {
          console.log(
            `  → Too many code blocks missing (${(missingRatio * 100).toFixed(1)}%)`,
          );
          return false;
        }
        console.log(
          `  → Allowing minor code block mismatch for chunked translation`,
        );
      } else {
        return false;
      }
    }

    // Check if code blocks are properly closed
    if (translatedCodeBlocks % 2 !== 0) {
      console.log('Unclosed code block detected');
      return false;
    }

    // Headers should roughly match (allow some variance for translation differences)
    const headerDiff = Math.abs(originalHeaders - translatedHeaders);
    if (headerDiff > 3) {
      console.log(
        `Header count mismatch: original=${originalHeaders}, translated=${translatedHeaders}`,
      );
      // For chunked translations, allow more variance
      if (!isChunked || headerDiff > 5) {
        return false;
      }
    }

    // Check if translation ends abruptly (no proper ending)
    // Only check if the last non-empty line is inside a code block
    const lines = translated.trim().split('\n');
    let inCodeBlockAtEnd = false;
    for (const line of lines) {
      if (line.trim().startsWith('```')) {
        inCodeBlockAtEnd = !inCodeBlockAtEnd;
      }
    }
    if (inCodeBlockAtEnd) {
      console.log('Translation appears to end mid-code-block');
      return false;
    }

    // Check minimum length ratio (translated should be at least 30% of original)
    const lengthRatio = translated.length / original.length;
    if (lengthRatio < 0.3) {
      console.log(
        `Translation too short: ${(lengthRatio * 100).toFixed(1)}% of original`,
      );
      return false;
    }

    return true;
  }

  private async callClaudeAPI(
    content: string,
    contextNote = '',
    retries = 3,
  ): Promise<string> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(
          `    Attempt ${attempt}/${retries}${attempt > 1 ? ' (retry)' : ''}`,
        );

        // Use streaming to avoid timeouts on long articles
        const stream = await this.client.messages.stream({
          model: this.config.model!,
          max_tokens: 80000,
          messages: [
            {
              role: 'user',
              content: `Please translate the following Chinese markdown document to English.

CRITICAL REQUIREMENTS:
1. You MUST translate the ENTIRE document from start to finish
2. You MUST include ALL code blocks exactly as they appear (do not modify or omit any but translate comments inside code blocks if they are in Chinese)
3. You MUST preserve ALL markdown structure (headers, lists, links, etc.)
4. Keep ALL frontmatter (YAML between ---) UNCHANGED, but translate Chinese content inside, including the title, tags, etc.
5. Keep ALL URLs and links UNCHANGED
6. Translate only the main content text
7. Keep technical terms accurate
8. Maintain natural English flow
9. Do NOT add any explanations or comments
10. Do NOT stop mid-document - complete the entire translation${contextNote}

VERIFICATION: The document contains ${(content.match(/```/g) || []).length / 2} code blocks. Your translation MUST contain exactly the same number.

Here's the document:

${content}`,
            },
          ],
        });

        let translatedText = '';
        for await (const chunk of stream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            translatedText += chunk.delta.text;
          }
        }

        return translatedText;
      } catch (error: any) {
        const isLastAttempt = attempt === retries;

        if (error.name === 'AbortError' || error.code === 'ETIMEDOUT') {
          console.log(`Timeout error`);
        } else if (error.status === 429) {
          console.log(`Rate limit hit`);
        } else if (error.status >= 500) {
          console.log(`Server error: ${error.status}`);
        } else if (
          error.code === 'ECONNRESET' ||
          error.code === 'ECONNABORTED'
        ) {
          console.log(`Connection error: ${error.code}`);
        } else {
          console.log(
            `Error: ${error.message || error.code || 'Unknown error'}`,
          );
        }

        if (isLastAttempt) {
          throw new Error(
            `Translation failed after ${retries} attempts: ${error.message || error.code}`,
          );
        }

        // Exponential backoff: 2s, 4s, 8s...
        const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
        console.log(`Waiting ${delay / 1000}s before retry...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }

    throw new Error('Translation failed: max retries exceeded');
  }

  private needsTranslation(filePath: string, content: string): boolean {
    const hash = this.getFileHash(content);
    const cached = this.cache[filePath];

    if (!cached) return true;
    if (cached.hash !== hash) return true;
    if (!fs.existsSync(cached.translatedPath)) return true;

    // Validate existing translation
    try {
      const translatedContent = fs.readFileSync(cached.translatedPath, 'utf-8');
      if (!this.validateTranslation(content, translatedContent)) {
        console.log('Existing translation is incomplete, will re-translate');
        return true;
      }
    } catch (error) {
      console.log('Failed to read existing translation, will re-translate');
      return true;
    }

    return false;
  }

  async translateFile(sourceFile: string): Promise<void> {
    const relativePath = path.relative(this.config.sourceDir, sourceFile);
    const targetFile = path.join(this.config.targetDir, relativePath);

    console.log(`\nProcessing: ${relativePath}`);

    const content = fs.readFileSync(sourceFile, 'utf-8');

    if (!this.needsTranslation(sourceFile, content)) {
      console.log(`  ✓ Skipped (unchanged)`);
      return;
    }

    console.log(`  → Translating...`);

    try {
      // Split into chunks for long documents
      const chunks = this.splitIntoChunks(content);

      if (chunks.length > 1) {
        console.log(`  → Split into ${chunks.length} chunks`);
      }

      let translated = '';

      // Translate each chunk
      for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
          console.log(`  → Translating chunk ${i + 1}/${chunks.length}...`);
        }

        const chunkTranslation = await this.translateChunk(
          chunks[i],
          i,
          chunks.length,
        );

        // Verify chunk translation
        const originalChunkCodeBlocks = (chunks[i].match(/```/g) || []).length;
        const translatedChunkCodeBlocks = (chunkTranslation.match(/```/g) || [])
          .length;

        if (originalChunkCodeBlocks !== translatedChunkCodeBlocks) {
          console.log(
            `Chunk ${i + 1} code block mismatch: original=${originalChunkCodeBlocks}, translated=${translatedChunkCodeBlocks}`,
          );
        }

        // For first chunk, use as is (includes frontmatter)
        // For subsequent chunks, append without frontmatter
        if (i === 0) {
          translated = chunkTranslation;
        } else {
          // Remove any duplicate frontmatter from subsequent chunks
          const cleanChunk = chunkTranslation.replace(/^---[\s\S]*?---\n/, '');
          translated += '\n' + cleanChunk;
        }
      }

      // Log final statistics
      const finalCodeBlocks = (translated.match(/```/g) || []).length;
      const originalCodeBlocks = (content.match(/```/g) || []).length;
      console.log(
        `  → Final code blocks: ${finalCodeBlocks}/${originalCodeBlocks}`,
      );

      // Validate translation completeness
      if (!this.validateTranslation(content, translated, chunks.length > 1)) {
        throw new Error(
          'Translation validation failed - incomplete or corrupted output',
        );
      }

      fs.mkdirSync(path.dirname(targetFile), { recursive: true });
      fs.writeFileSync(targetFile, translated, 'utf-8');

      this.cache[sourceFile] = {
        hash: this.getFileHash(content),
        translatedPath: targetFile,
        timestamp: Date.now(),
      };

      // Save cache after each successful translation
      this.saveCache();

      console.log(`  ✓ Translated successfully`);
    } catch (error: any) {
      console.error(`  ✗ Translation failed: ${error.message}`);
      // Don't throw, continue with next file
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
