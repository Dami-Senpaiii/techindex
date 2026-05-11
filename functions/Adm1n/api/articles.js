import { json, normalizeArticle, readArticles, writeArticles } from '../../_lib/articles.js';

export async function onRequestGet(context) {
  const articles = await readArticles(context.env);
  return json({ articles, persistent: Boolean(getStore(context.env)) });
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON.' }, { status: 400 });
  const nextArticle = normalizeArticle(body);
  const articles = await readArticles(context.env);
  const index = articles.findIndex((article) => article.id === nextArticle.id || article.slug === nextArticle.slug);
  const nextArticles = [...articles];
  if (index >= 0) nextArticles[index] = { ...nextArticles[index], ...nextArticle };
  else nextArticles.unshift(nextArticle);
  const persistent = await writeArticles(context.env, nextArticles);
  if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
  return json({ article: nextArticle, articles: nextArticles, persistent });
}

export async function onRequestPatch(context) {
  const body = await context.request.json().catch(() => null);
  if (!body || !body.id) return json({ error: 'Missing article id.' }, { status: 400 });
  const articles = await readArticles(context.env);
  const nextArticles = articles.map((article) => article.id === body.id ? { ...article, status: body.status } : article);
  const persistent = await writeArticles(context.env, nextArticles);
  if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
  return json({ articles: nextArticles, persistent });
}

function getStore(env) {
  return env.TECHINDEX_ARTICLES || env.ARTICLE_STORE || env.ARTICLES_KV;
}
