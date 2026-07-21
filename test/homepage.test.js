import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('the decorative hero overlay cannot block homepage controls', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(homepage, /\.hero::before\{[^}]*pointer-events:none[^}]*\}/);
});

test('the homepage exposes a single topic dropdown', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(homepage, /<select class="tag-filter" id="tag-filter">/);
  assert.doesNotMatch(homepage, /<button[^>]+data-tag=/);
});
