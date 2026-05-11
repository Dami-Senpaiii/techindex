import { escapeHtml, publicArticles, readArticles, slugify } from '../_lib/articles.js';

export async function onRequestGet(context) {
  const slug = slugify(context.params.slug || '');
  const articles = publicArticles(await readArticles(context.env));
  const article = articles.find((item) => item.slug === slug);
  if (!article) return new Response('Article not found', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
  return new Response(renderArticle(article), {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
}

function formatDate(value) {
  if (!value) return 'Heute';
  return new Date(`${value}T12:00:00`).toLocaleDateString('de-CH', { day: '2-digit', month: 'long', year: 'numeric' });
}

function renderContent(content) {
  const blocks = String(content || '').split(/\n{2,}/).map((block) => block.trim()).filter(Boolean);
  if (!blocks.length) return '<p>Artikelinhalt erscheint hier.</p>';
  return blocks.map((block) => {
    if (block.startsWith('## ')) return `<h2>${escapeHtml(block.slice(3))}</h2>`;
    return `<p>${escapeHtml(block).replace(/\n/g, '<br>')}</p>`;
  }).join('\n');
}

function imageSrc(article) {
  if (!article.image) return `https://picsum.photos/seed/${article.slug}/1200/630`;
  if (article.image.startsWith('pictures/')) return `/articles/${article.image}`;
  return article.image;
}

function renderArticle(article) {
  const description = article.description || article.excerpt || article.title;
  return `<!doctype html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
  <title>${escapeHtml(article.title)} - TechIndex</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta name="theme-color" content="#0a0a0a" />
  <style>:root{--bg:#0a0a0a;--panel:#121212;--muted:#a1a1a1;--text:#fff;--border:#1f1f1f;--accent:#76B900;--radius:18px;--max:880px}*{box-sizing:border-box}html,body{margin:0;background:var(--bg);color:var(--text);font:17px/1.65 system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif}a{color:inherit;text-decoration:none}a:hover{color:var(--accent)}img{max-width:100%;display:block}.container{max-width:var(--max);padding:0 24px;margin:0 auto}.nav{position:sticky;top:0;z-index:50;background:rgba(0,0,0,.82);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}.nav-inner{display:flex;align-items:center;justify-content:space-between;padding:14px 0}.brand{display:flex;gap:12px;align-items:center;font-weight:720}.brand-badge{width:30px;height:30px;border:2px solid var(--accent);border-radius:10px;display:grid;place-items:center}.brand-badge svg{stroke:var(--accent)}.menu{display:flex;gap:18px;font-size:.95rem}.menu a{color:#eaeaea;opacity:.85}main{padding:56px 0 80px}.post-header{margin-bottom:32px}.post-tag{display:inline-flex;padding:6px 12px;border:1px solid var(--border);border-radius:999px;font-size:.85rem;background:rgba(118,185,0,.08);color:#d7ffd7}h1{margin:18px 0 10px;font-size:clamp(30px,5vw,44px);line-height:1.15}.post-meta{color:var(--muted);font-size:.95rem;margin-bottom:14px}.lead{color:#d6ffd6;font-size:1.1rem;max-width:720px}figure.hero{margin:0 0 36px;border-radius:var(--radius);overflow:hidden;border:1px solid var(--border);background:var(--panel)}figure.hero img{width:100%;height:auto}figcaption{padding:12px 16px;color:var(--muted);font-size:.9rem}section{margin-bottom:42px}section h2{font-size:clamp(22px,3vw,30px);margin:0 0 14px}section p{margin:0 0 16px}.post-footer{border-top:1px solid var(--border);padding-top:24px;margin-top:32px}.back-link{color:var(--accent);font-weight:700}footer{border-top:1px solid var(--border);padding:32px 0;background:#090909}.muted{color:var(--muted);font-size:.9rem}@media (max-width:720px){main{padding:44px 0 64px}.nav-inner{flex-direction:column;gap:14px}.menu{flex-wrap:wrap;justify-content:center}}</style>
</head>
<body>
  <header class="nav"><div class="container nav-inner"><a class="brand" href="/"><span class="brand-badge" aria-hidden="true"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="4" ry="4"/><path d="M7 16l5-8 5 8" fill="none"/></svg></span><span>TechIndex</span></a><nav class="menu" aria-label="Hauptnavigation"><a href="/">Magazin</a><a href="/about.html">Ueber uns</a></nav></div></header>
  <main><article class="post container"><header class="post-header"><span class="post-tag">${escapeHtml(article.category)}</span><h1>${escapeHtml(article.title)}</h1><p class="post-meta">Aktualisiert: ${formatDate(article.date)} - Lesezeit: ${escapeHtml(article.readingTime)}</p><p class="lead">${escapeHtml(article.excerpt || description)}</p></header><figure class="hero"><img src="${escapeHtml(imageSrc(article))}" alt="${escapeHtml(article.imageAlt || article.title)}" loading="lazy"><figcaption>${escapeHtml(article.imageAlt || article.title)}</figcaption></figure><section>${renderContent(article.content)}</section><footer class="post-footer"><a class="back-link" href="/">Zurueck zum Magazin</a></footer></article></main>
  <footer><div class="container muted">TechIndex.ch</div></footer>
</body>
</html>`;
}
