import { ARTICLES_PER_PAGE, json, paginateArticles, publicArticles, readArticles } from '../_lib/articles.js';

export async function onRequestGet(context) {
  try {
    const articles = publicArticles(await readArticles(context.env));
    const url = new URL(context.request.url);
    const tag = normalize(url.searchParams.get('tag'));
    const query = normalize(url.searchParams.get('q'));
    const filtered = articles.filter((article) => {
      const tags = [article.category, article.tag, ...(Array.isArray(article.tags) ? article.tags : [article.tags])]
        .map(normalize);
      const haystack = [article.title, article.excerpt, article.description, ...tags].map(normalize).join(' ');
      return (!tag || tags.includes(tag)) && (!query || haystack.includes(query));
    });
    return json(paginateArticles(filtered, url.searchParams.get('page'), ARTICLES_PER_PAGE), {
      // Avoid one KV read for every homepage visit. Revalidation keeps newly
      // published articles visible promptly while stale data bridges outages.
      headers: { 'Cache-Control': 'public, max-age=60, stale-if-error=86400' }
    });
  } catch (error) {
    const requestId = context.request.headers.get('cf-ray') || crypto.randomUUID();
    console.error('Public article storage error', { requestId, message: error && error.message });
    return json({ error: 'Artikel konnten vorübergehend nicht geladen werden.', requestId }, {
      status: 503,
      headers: { 'Cache-Control': 'no-store', 'Retry-After': '2' }
    });
  }
}

function normalize(value) {
  return String(value || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}
