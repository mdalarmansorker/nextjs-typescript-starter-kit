import { execFileSync } from 'node:child_process';
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

export interface ModuleNames {
  /** `blogpost` */
  lower: string;
  /** `BlogPost` */
  pascal: string;
  /** `blog_post` */
  snake: string;
  /** `blog-post` */
  kebab: string;
  /** `BLOG_POST` */
  constant: string;
  /** `blogposts` */
  lowerPlural: string;
  /** `BlogPosts` */
  pascalPlural: string;
  /** `blog_posts` */
  snakePlural: string;
  /** `blog-posts` */
  kebabPlural: string;
  /** `BLOG_POSTS` */
  constantPlural: string;
}

/**
 * Pluralizes one lowercase English word with the common rules. Irregular words (`person`, `child`)
 * are not handled: rename the generated files if you need them.
 */
export function pluralize(word: string): string {
  if (/[^aeiou]y$/.test(word)) return word.slice(0, -1) + 'ies';
  if (/(s|x|z|ch|sh)$/.test(word)) return word + 'es';

  return word + 's';
}

/**
 * Splits a name in any case (`blogPost`, `BlogPost`, `blog_post`, `blog-post`, `HTTPRequest`) into
 * words and returns it in every case the generators need, singular and plural.
 */
export function normalizeModuleName(name: string): ModuleNames {
  const words = name
    .replace(/[-_]/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2') // split camelCase
    .replace(/([A-Z]+)([A-Z][a-z0-9]+)/g, '$1 $2') // split ALLCAPS followed by CapitalWord
    .split(/\s+/)
    .filter(Boolean)
    .map(w => w.toLowerCase());

  if (words.length === 0 || words.some(w => !/^[a-z][a-z0-9]*$/.test(w))) {
    throw new Error(`"${name}" is not a valid module name. Use letters and digits, e.g. blogPost or blog-post.`);
  }

  const toCases = (parts: string[]) => ({
    lower: parts.join(''),
    pascal: parts.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(''),
    snake: parts.join('_'),
    kebab: parts.join('-'),
    constant: parts.join('_').toUpperCase(),
  });

  const singular = toCases(words);
  // Not empty: checked above.
  const lastWord = words.at(-1) as string;
  const plural = toCases([...words.slice(0, -1), pluralize(lastWord)]);

  return {
    ...singular,
    lowerPlural: plural.lower,
    pascalPlural: plural.pascal,
    snakePlural: plural.snake,
    kebabPlural: plural.kebab,
    constantPlural: plural.constant,
  };
}

/**
 * Exits with an error when any of the files already exists, so a generator never overwrites work.
 */
export function assertFilesDoNotExist(paths: string[]): void {
  const existing = paths.filter(path => existsSync(path));

  if (existing.length > 0) {
    console.error(`❌ Nothing was created. These files already exist:\n${existing.map(p => `   ${p}`).join('\n')}`);
    process.exit(1);
  }
}

/** Writes a file, creating its folders. */
export function writeFile(path: string, content: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content.endsWith('\n') ? content : `${content}\n`);
}

/** Appends a line to an index file unless it is already there. */
export function appendExport(indexPath: string, line: string): void {
  const current = existsSync(indexPath) ? readFileSync(indexPath, 'utf8') : '';

  if (current.split('\n').includes(line)) return;

  appendFileSync(indexPath, `${current === '' || current.endsWith('\n') ? '' : '\n'}${line}\n`);
}

/**
 * Formats and lint-fixes generated files (import order, Prettier), so they match the rest of the code.
 */
export function tidy(paths: string[]): void {
  try {
    execFileSync('npx', ['eslint', '--fix', ...paths], { stdio: 'inherit' });
    execFileSync('npx', ['prettier', '--write', '--log-level', 'warn', ...paths], { stdio: 'inherit' });
  } catch {
    console.warn('⚠️  The files were created, but formatting them failed. Run `npm run lint:fix && npm run format`.');
  }
}
