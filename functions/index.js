import {
  ARTICLES_PER_PAGE,
  escapeHtml,
  paginateArticles,
  publicArticles,
  readArticles,
} from './_lib/articles.js';

const POSTS_MARKER = '<!-- SERVER_RENDERED_POSTS -->';
const DATA_MARKER = '<!-- SERVER_RENDERED_ARTICLE_DATA -->';

export async function onRequestGet(context) {
  const assetResponse = await context.next();
  const contentType = assetResponse.headers.get('content-type') || '';
  if (!assetResponse.ok || !contentType.includes('text/html')) return assetResponse;
  const fallbackResponse = assetResponse.clone();

  try {
    const articles = publicArticles(await readArticles(context.env));
    const firstPage = paginateArticles(articles, 1, ARTICLES_PER_PAGE);
    const template = await assetResponse.text();
    const html = template
      .replace(POSTS_MARKER, firstPage.articles.map(renderArticleCard).join('\n'))
      .replace(DATA_MARKER, serializeInitialData(firstPage));

    const headers = new Headers(assetResponse.headers);
    headers.delete('content-length');
    headers.set('Cache-Control', 'public, max-age=60, stale-if-error=86400');
    return new Response(html, { status: assetResponse.status, headers });
  } catch (error) {
    console.error('Homepage article rendering failed', { message: error && error.message });
    return fallbackResponse;
  }
}

function renderArticleCard(article) {
  const category = article.category || article.tag || '';
  const excerpt = article.excerpt || article.description || '';
  const date = validDate(article.date);
  return `<article class="card">
  <a href="/articles/${encodeURIComponent(article.slug)}">
    <div class="thumb"><img src="${escapeHtml(articleImage(article))}" alt="${escapeHtml(article.imageAlt || 'Vorschaubild')}" loading="lazy"></div>
    <div class="body">
      <div class="card-meta"><span>${escapeHtml(category)}</span><time datetime="${date.toISOString()}">${formatDate(date)}</time></div>
      <h3 class="title">${escapeHtml(article.title)}</h3>
      <p class="muted">${escapeHtml(excerpt)}</p>
      <span class="read-more">Weiterlesen →</span>
    </div>
  </a>
</article>`;
}

function articleImage(article) {
  if (!article.image) return `https://picsum.photos/seed/${encodeURIComponent(article.slug)}/800/450`;
  if (article.image.startsWith('pictures/')) return `/articles/${article.image}`;
  return article.image;
}

function validDate(value) {
  const date = new Date(`${value || new Date().toISOString().slice(0, 10)}T12:00:00Z`);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function formatDate(date) {
  return new Intl.DateTimeFormat('de-CH', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

function serializeInitialData(data) {
  return JSON.stringify(data).replace(/</g, '\\u003c');
}
