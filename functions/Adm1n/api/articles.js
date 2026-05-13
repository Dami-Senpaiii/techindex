import { getArticleStore, json, normalizeArticle, readArticles, writeArticles } from '../../_lib/articles.js';

export async function onRequestGet(context) {
  const articles = await readArticles(context.env);
  return json({ articles, persistent: Boolean(getArticleStore(context.env)) });
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
  const key = String((body && (body.id || body.slug)) || '').trim();
  const status = String((body && body.status) || '').trim();
  if (!key) return json({ error: 'Missing article id.' }, { status: 400 });
  if (!['live', 'draft', 'archived', 'deleted'].includes(status)) return json({ error: 'Invalid article status.' }, { status: 400 });
  const articles = await readArticles(context.env);
  let found = false;
  const nextArticles = articles.map((article) => {
    if (article.id !== key && article.slug !== key) return article;
    found = true;
    return { ...article, id: article.id || article.slug, status };
  });
  if (!found) return json({ error: 'Article not found.', articles, persistent: Boolean(getArticleStore(context.env)) }, { status: 404 });
  const persistent = await writeArticles(context.env, nextArticles);
  if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
  return json({ articles: nextArticles, persistent });
}
