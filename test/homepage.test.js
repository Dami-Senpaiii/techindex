import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

import { onRequestGet } from '../functions/index.js';

test('the decorative hero overlay cannot block homepage controls', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(homepage, /\.hero::before\{[^}]*pointer-events:none[^}]*\}/);
});

test('the homepage exposes a single topic dropdown', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');

  assert.match(homepage, /<select class="tag-filter" id="tag-filter">/);
  assert.doesNotMatch(homepage, /<button[^>]+data-tag=/);
});

test('the homepage response contains server-rendered semantic article cards', async () => {
  const homepage = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  const articles = [{
    slug: 'server-rendered', title: 'Bereits im HTML', status: 'live',
    category: 'Software', excerpt: 'Für Crawler sichtbar', date: '2026-07-22'
  }];
  const response = await onRequestGet({
    env: { TECHINDEX_ARTICLES: { async get() { return articles; }, async put() {} } },
    async next() { return new Response(homepage, { headers: { 'Content-Type': 'text/html' } }); },
  });
  const html = await response.text();

  assert.match(html, /<article class="card">/);
  assert.match(html, /<a href="\/articles\/server-rendered">/);
  assert.match(html, /<h3 class="title">Bereits im HTML<\/h3>/);
  assert.match(html, /<p class="muted">Für Crawler sichtbar<\/p>/);
  assert.match(html, /"articles":\[\{"slug":"server-rendered"/);
});
