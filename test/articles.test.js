import assert from 'node:assert/strict';
import test from 'node:test';

import { publicArticles, readArticles, reorderArticles, writeArticles } from '../functions/_lib/articles.js';
import { onRequestGet } from '../functions/api/articles.js';
import { onRequestPatch as onAdminPatch } from '../functions/Adm1n/api/articles.js';

test('KV reads retry transient failures', async () => {
  let attempts = 0;
  const env = { TECHINDEX_ARTICLES: {
    async get() {
      attempts += 1;
      if (attempts < 3) throw Object.assign(new Error('temporarily unavailable'), { status: 503 });
      return [{ id: 'working' }];
    },
    async put() {}
  } };

  assert.deepEqual(await readArticles(env), [{ id: 'working' }]);
  assert.equal(attempts, 3);
});

test('KV writes retry the same-key rate limit', async () => {
  let attempts = 0;
  const env = { TECHINDEX_ARTICLES: {
    async get() { return []; },
    async put() {
      attempts += 1;
      if (attempts < 2) throw Object.assign(new Error('Too many requests'), { status: 429 });
    }
  } };

  assert.equal(await writeArticles(env, [{ id: 'saved' }]), true);
  assert.equal(attempts, 2);
});

test('public API returns a controlled 503 when KV remains unavailable', async () => {
  const env = { TECHINDEX_ARTICLES: {
    async get() { throw Object.assign(new Error('network unavailable'), { status: 503 }); },
    async put() {}
  } };
  const response = await onRequestGet({ env, request: new Request('https://example.test/api/articles') });

  assert.equal(response.status, 503);
  assert.equal(response.headers.get('retry-after'), '2');
  const data = await response.json();
  assert.equal(data.error, 'Artikel konnten vorübergehend nicht geladen werden.');
  assert.ok(data.requestId);
});

test('public API returns articles in pages of nine', async () => {
  const articles = Array.from({ length: 20 }, (_, index) => ({
    id: `article-${index}`,
    slug: `article-${index}`,
    title: `Article ${index}`,
    status: 'live',
    date: `2026-07-${String(index + 1).padStart(2, '0')}`
  }));
  const env = { TECHINDEX_ARTICLES: {
    async get() { return articles; },
    async put() {}
  } };
  const response = await onRequestGet({ env, request: new Request('https://example.test/api/articles?page=2') });
  const data = await response.json();

  assert.equal(data.articles.length, 9);
  assert.deepEqual(data.pagination, { page: 2, pageSize: 9, total: 20, totalPages: 3 });
});

test('public API returns every available tag independently of pagination', async () => {
  const articles = [
    { slug: 'one', title: 'One', status: 'live', date: '2026-07-03', category: 'Hardware' },
    { slug: 'two', title: 'Two', status: 'live', date: '2026-07-02', tag: 'Software' },
    { slug: 'three', title: 'Three', status: 'live', date: '2026-07-01', tags: ['Ratgeber', 'Hardware'] },
  ];
  const env = { TECHINDEX_ARTICLES: {
    async get() { return articles; },
    async put() {}
  } };
  const response = await onRequestGet({ env, request: new Request('https://example.test/api/articles?tag=Hardware') });
  const data = await response.json();

  assert.deepEqual(data.tags, ['Hardware', 'Ratgeber', 'Software']);
  assert.equal(data.pagination.total, 2);
});

test('public articles keep the order selected in the admin', () => {
  const articles = [
    { id: 'older-first', status: 'live', date: '2026-01-01' },
    { id: 'newer-second', status: 'live', date: '2026-07-01' },
    { id: 'draft', status: 'draft', date: '2026-08-01' },
  ];

  assert.deepEqual(publicArticles(articles).map((article) => article.id), ['older-first', 'newer-second']);
});

test('reordering a page preserves articles outside that page', () => {
  const articles = ['a', 'b', 'c', 'd'].map((id) => ({ id }));

  assert.deepEqual(reorderArticles(articles, ['c', 'b']).map((article) => article.id), ['a', 'c', 'b', 'd']);
  assert.equal(reorderArticles(articles, ['unknown']), null);
});

test('admin API persists a drag-and-drop article order', async () => {
  let stored = [
    { id: 'one', slug: 'one', status: 'live' },
    { id: 'two', slug: 'two', status: 'live' },
    { id: 'three', slug: 'three', status: 'draft' },
  ];
  const env = { TECHINDEX_ARTICLES: {
    async get() { return stored; },
    async put(_key, value) { stored = JSON.parse(value); }
  } };
  const response = await onAdminPatch({
    env,
    request: new Request('https://example.test/Adm1n/api/articles', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: ['two', 'one'] })
    })
  });

  assert.equal(response.status, 200);
  assert.deepEqual(stored.map((article) => article.id), ['two', 'one', 'three']);
});
