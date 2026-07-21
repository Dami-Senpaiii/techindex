import { ARTICLES_PER_PAGE, getArticleStore, json, normalizeArticle, paginateArticles, readArticles, reorderArticles, writeArticles } from '../../_lib/articles.js';

export async function onRequestGet(context) {
  try {
    const articles = await readArticles(context.env);
    const url = new URL(context.request.url);
    const query = String(url.searchParams.get('q') || '').trim().toLowerCase();
    const status = String(url.searchParams.get('status') || '');
    const category = String(url.searchParams.get('category') || '');
    const filtered = articles.filter((article) => {
      const statusMatches = status ? article.status === status : article.status !== 'deleted';
      const haystack = `${article.title} ${article.category} ${article.slug}`.toLowerCase();
      return statusMatches && (!category || article.category === category) && (!query || haystack.includes(query));
    });
    const summary = {
      total: articles.filter((article) => article.status !== 'deleted').length,
      live: articles.filter((article) => article.status === 'live').length,
      draft: articles.filter((article) => article.status === 'draft').length,
      archived: articles.filter((article) => article.status === 'archived').length
    };
    return json({ ...paginateArticles(filtered, url.searchParams.get('page'), ARTICLES_PER_PAGE), summary, persistent: Boolean(getArticleStore(context.env)) });
  } catch (error) {
    return storageError(error, context, 'Artikel konnten nicht aus dem KV-Speicher gelesen werden.');
  }
}

export async function onRequestPost(context) {
  const body = await context.request.json().catch(() => null);
  if (!body) return json({ error: 'Invalid JSON.' }, { status: 400 });
  const nextArticle = normalizeArticle(body);
  let articles;
  try {
    articles = await readArticles(context.env);
  } catch (error) {
    return storageError(error, context, 'Artikel konnten vor dem Speichern nicht aus KV gelesen werden.');
  }
  const index = articles.findIndex((article) => article.id === nextArticle.id || article.slug === nextArticle.slug);
  const nextArticles = [...articles];
  if (index >= 0) nextArticles[index] = { ...nextArticles[index], ...nextArticle };
  else nextArticles.unshift(nextArticle);
  let persistent;
  try {
    persistent = await writeArticles(context.env, nextArticles);
  } catch (error) {
    return storageError(error, context, 'Der Artikel konnte nicht in KV gespeichert werden.');
  }
  if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
  return json({ article: nextArticle, persistent });
}

export async function onRequestPatch(context) {
  const body = await context.request.json().catch(() => null);
  if (body && Array.isArray(body.order)) return saveArticleOrder(context, body.order);
  const key = String((body && (body.id || body.slug)) || '').trim();
  const status = String((body && body.status) || '').trim();
  if (!key) return json({ error: 'Missing article id.' }, { status: 400 });
  if (!['live', 'draft', 'archived', 'deleted'].includes(status)) return json({ error: 'Invalid article status.' }, { status: 400 });
  let articles;
  try {
    articles = await readArticles(context.env);
  } catch (error) {
    return storageError(error, context, 'Artikel konnten vor der Statusänderung nicht aus KV gelesen werden.');
  }
  let found = false;
  const nextArticles = articles.map((article) => {
    if (article.id !== key && article.slug !== key) return article;
    found = true;
    return { ...article, id: article.id || article.slug, status };
  });
  if (!found) return json({ error: 'Article not found.', articles, persistent: Boolean(getArticleStore(context.env)) }, { status: 404 });
  let persistent;
  try {
    persistent = await writeArticles(context.env, nextArticles);
  } catch (error) {
    return storageError(error, context, 'Der Artikelstatus konnte nicht in KV gespeichert werden.');
  }
  if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
  return json({ persistent });
}

async function saveArticleOrder(context, order) {
  let articles;
  try {
    articles = await readArticles(context.env);
  } catch (error) {
    return storageError(error, context, 'Artikel konnten vor dem Sortieren nicht aus KV gelesen werden.');
  }
  const nextArticles = reorderArticles(articles, order);
  if (!nextArticles) return json({ error: 'Die Artikelliste enthält unbekannte Artikel.' }, { status: 400 });
  try {
    const persistent = await writeArticles(context.env, nextArticles);
    if (!persistent) return json({ error: 'Missing KV binding TECHINDEX_ARTICLES.', articles: nextArticles, persistent }, { status: 501 });
    return json({ persistent });
  } catch (error) {
    return storageError(error, context, 'Die Artikelreihenfolge konnte nicht in KV gespeichert werden.');
  }
}

function storageError(error, context, fallback) {
  const requestId = context.request.headers.get('cf-ray') || crypto.randomUUID();
  console.error('Article storage error', { requestId, code: error && error.code, message: error && error.message });
  if (error && error.code === 'ARTICLE_STORE_TOO_LARGE') {
    return json({
      error: 'Der Artikelspeicher ist zu gross. Hochgeladene Bilder werden als Base64 mitgespeichert; bitte ein kleineres Bild oder eine Bild-URL verwenden.',
      code: error.code,
      details: { bytes: error.bytes, maximumBytes: 24_000_000 },
      requestId,
    }, { status: 413 });
  }
  return json({ error: fallback, code: 'ARTICLE_STORAGE_ERROR', requestId }, {
    status: 503,
    headers: { 'Retry-After': '2' }
  });
}
