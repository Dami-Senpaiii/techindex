const STORE_KEY = 'articles';
// Cloudflare KV values are limited to 25 MB. Keep a little headroom for
// platform-side encoding/metadata and return a useful error before KV rejects it.
export const MAX_STORE_BYTES = 24_000_000;
export const STORE_BINDINGS = ['TECHINDEX_ARTICLES', 'techindex-articles', 'ARTICLE_STORE', 'ARTICLES_KV'];

const EMPTY_ARTICLES = [];

export function getArticleStore(env) {
  return STORE_BINDINGS
    .map((name) => env[name])
    .find((store) => store && typeof store.get === 'function' && typeof store.put === 'function')
    || null;
}

export async function readArticles(env) {
  const store = getArticleStore(env);
  if (!store) return EMPTY_ARTICLES;
  const stored = await store.get(STORE_KEY, 'json');
  return Array.isArray(stored) ? stored : EMPTY_ARTICLES;
}

export async function writeArticles(env, articles) {
  const store = getArticleStore(env);
  if (!store) return false;
  const serialized = JSON.stringify(articles);
  const bytes = new TextEncoder().encode(serialized).byteLength;
  if (bytes > MAX_STORE_BYTES) {
    const error = new Error(`Article store needs ${bytes} bytes; maximum is ${MAX_STORE_BYTES} bytes.`);
    error.code = 'ARTICLE_STORE_TOO_LARGE';
    error.bytes = bytes;
    throw error;
  }
  await store.put(STORE_KEY, serialized);
  return true;
}

export function publicArticles(articles) {
  return articles
    .filter((article) => article.status === 'live')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
}

export function normalizeArticle(input) {
  const title = clean(input.title) || 'Unbenannter Artikel';
  const slug = slugify(input.slug || title) || 'unbenannter-artikel';
  return {
    id: clean(input.id) || slug,
    slug,
    title,
    category: clean(input.category) || 'Hardware',
    status: ['live', 'draft', 'archived', 'deleted'].includes(input.status) ? input.status : 'draft',
    author: clean(input.author) || 'TechIndex Redaktion',
    date: clean(input.date) || new Date().toISOString().slice(0, 10),
    readingTime: clean(input.readingTime) || 'ca. 6 Minuten',
    description: clean(input.description),
    excerpt: clean(input.excerpt),
    image: clean(input.image),
    imageAlt: clean(input.imageAlt),
    content: clean(input.content),
    html: clean(input.html)
  };
}

export function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(init.headers || {})
    }
  });
}

export function clean(value) {
  return String(value || '').trim();
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
