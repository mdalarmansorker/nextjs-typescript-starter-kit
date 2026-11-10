import { describe, expect, it } from 'vitest';

import { normalizeModuleName, pluralize } from './utils.mts';

describe('pluralize', () => {
  it.each([
    ['post', 'posts'],
    ['category', 'categories'],
    ['key', 'keys'],
    ['day', 'days'],
    ['status', 'statuses'],
    ['box', 'boxes'],
    ['branch', 'branches'],
    ['dish', 'dishes'],
  ])('%s -> %s', (word, plural) => {
    expect(pluralize(word)).toBe(plural);
  });
});

describe('normalizeModuleName', () => {
  it.each(['blogPost', 'BlogPost', 'blog_post', 'blog-post', 'blog post'])('reads %s', name => {
    expect(normalizeModuleName(name)).toEqual({
      lower: 'blogpost',
      pascal: 'BlogPost',
      snake: 'blog_post',
      kebab: 'blog-post',
      constant: 'BLOG_POST',
      lowerPlural: 'blogposts',
      pascalPlural: 'BlogPosts',
      snakePlural: 'blog_posts',
      kebabPlural: 'blog-posts',
      constantPlural: 'BLOG_POSTS',
    });
  });

  it('splits acronyms', () => {
    expect(normalizeModuleName('HTTPRequest').snakePlural).toBe('http_requests');
  });

  it.each(['', '---', '../etc', 'blog.post', '1st'])('rejects %p', name => {
    expect(() => normalizeModuleName(name)).toThrow('is not a valid module name');
  });
});
