import { json, publicArticles, readArticles } from '../_lib/articles.js';

export async function onRequestGet(context) {
  const articles = await readArticles(context.env);
  return json({ articles: publicArticles(articles) }, { headers: { 'Cache-Control': 'no-store' } });
}
