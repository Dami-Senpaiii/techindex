export function normalizeFilterValue(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-CH')
    .trim();
}

function articleTagValues(article) {
  const tags = Array.isArray(article.tags) ? article.tags : [article.tags];
  return [article.category, article.tag, ...tags].filter((value) => normalizeFilterValue(value));
}

function articleTags(article) {
  return articleTagValues(article).map(normalizeFilterValue);
}

export function listArticleTags(articles) {
  const labelsByNormalizedTag = new Map();

  articles.forEach((article) => {
    articleTagValues(article).forEach((value) => {
      const label = String(value).trim();
      const normalizedTag = normalizeFilterValue(label);
      if (!labelsByNormalizedTag.has(normalizedTag)) labelsByNormalizedTag.set(normalizedTag, label);
    });
  });

  return [...labelsByNormalizedTag.values()].sort((a, b) => a.localeCompare(b, 'de-CH'));
}

export function filterArticles(articles, { tag = '', query = '' } = {}) {
  const normalizedTag = normalizeFilterValue(tag);
  const normalizedQuery = normalizeFilterValue(query);

  return articles.filter((article) => {
    const matchesTag = !normalizedTag || articleTags(article).includes(normalizedTag);
    const searchableText = [
      article.title,
      article.excerpt,
      article.description,
      article.category,
      article.tag,
      ...(Array.isArray(article.tags) ? article.tags : [article.tags]),
    ].map(normalizeFilterValue).join(' ');

    return matchesTag && (!normalizedQuery || searchableText.includes(normalizedQuery));
  });
}
