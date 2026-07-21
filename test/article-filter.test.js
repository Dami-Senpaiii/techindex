import assert from 'node:assert/strict';
import test from 'node:test';

import { filterArticles, normalizeFilterValue } from '../assets/article-filter.js';

const articles = [
  { title: 'Grafikkarten im Test', excerpt: 'Aktuelle GPUs', category: 'Hardware' },
  { title: 'RAW-Workflow', description: 'Fotos entwickeln', category: 'fotografie' },
  { title: 'Cloud Backup', excerpt: 'Sicher in der Wolke', tags: ['Software', 'Ratgeber'] },
];

test('tag selection matches categories and tags without case sensitivity', () => {
  assert.deepEqual(filterArticles(articles, { tag: 'Fotografie' }), [articles[1]]);
  assert.deepEqual(filterArticles(articles, { tag: 'software' }), [articles[2]]);
});

test('search covers article metadata and ignores accents and casing', () => {
  assert.deepEqual(filterArticles(articles, { query: 'FOTOS' }), [articles[1]]);
  assert.deepEqual(filterArticles(articles, { query: 'ratgeber' }), [articles[2]]);
  assert.equal(normalizeFilterValue('  Geräte  '), 'gerate');
});

test('search and tag selection can be combined', () => {
  assert.deepEqual(filterArticles(articles, { tag: 'Hardware', query: 'GPU' }), [articles[0]]);
  assert.deepEqual(filterArticles(articles, { tag: 'Hardware', query: 'Cloud' }), []);
});
