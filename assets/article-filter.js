export function normalizeFilterValue(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('de-CH')
    .trim();
}

function articleTags(article) {
  const tags = Array.isArray(article.tags) ? article.tags : [article.tags];
  return [article.category, article.tag, ...tags]
    .map(normalizeFilterValue)
    .filter(Boolean);
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
