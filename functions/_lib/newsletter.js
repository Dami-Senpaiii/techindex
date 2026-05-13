const STORE_KEY = 'newsletter-signups';
const STORE_BINDINGS = [
  'TECHINDEX_NEWSLETTER',
  'NEWSLETTER_STORE',
  'NEWSLETTER_KV',
  'SIGNUPS_KV',
  'TECHINDEX_ARTICLES',
  'ARTICLE_STORE',
  'ARTICLES_KV'
];

export function getStore(env) {
  return STORE_BINDINGS
    .map((name) => env[name])
    .find((store) => store && typeof store.get === 'function' && typeof store.put === 'function')
    || null;
}

export async function readSignups(env) {
  const store = getStore(env);
  if (!store) return [];
  const stored = await store.get(STORE_KEY, 'json');
  return Array.isArray(stored) ? stored : [];
}

export async function writeSignups(env, signups) {
  const store = getStore(env);
  if (!store) return false;
  await store.put(STORE_KEY, JSON.stringify(signups));
  return true;
}

export function normalizeEmail(value) {
  return String(value || '').trim().toLowerCase();
}

export function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
