import assert from 'node:assert/strict';
import test from 'node:test';

import { readArticles, writeArticles } from '../functions/_lib/articles.js';
import { onRequestGet } from '../functions/api/articles.js';

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
