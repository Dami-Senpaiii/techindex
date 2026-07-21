import { json, publicArticles, readArticles } from '../_lib/articles.js';

export async function onRequestGet(context) {
  try {
    const articles = await readArticles(context.env);
    return json({ articles: publicArticles(articles) }, {
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
