import { money, availableShippingOptions } from './commerce.js';
import { CATEGORY_LABELS, productSubtitle, selectProducts, productPath } from './catalogue.js';
const $ = (selector) => document.querySelector(selector);
const grid = $('#products');
const search = $('#model-search');
const params = new URLSearchParams(location.search);
let category = Object.hasOwn(CATEGORY_LABELS, params.get('kategorie')) ? params.get('kategorie') : 'handhelds';
let query = (params.get('suche') || '').slice(0, 100);
let page = Number.parseInt(params.get('seite'), 10) || 1;
let products = [];
let loading = false;
let hasLoaded = false;
search.value = query;
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function writeUrl() {
  const url = new URL(location.href);
  for (const [key, value] of [['kategorie', category === 'handhelds' ? '' : category], ['suche', query], ['seite', page > 1 ? page : '']]) { if (value) url.searchParams.set(key, value); else url.searchParams.delete(key); }
  history.replaceState(null, '', url);
}
function missingImage(product, container) { container.replaceChildren(); const label = element('span', 'missing-image', product.name); label.append(element('small', '', 'Produktbild folgt')); container.append(label); }
function productCard(product) {
  const card = element('article', 'product-card');
  const photoButton = element('a', 'product-image'); photoButton.href = productPath(product); photoButton.setAttribute('aria-label', `${product.name} ansehen`);
  if (product.image) {
    const image = element('img'); image.src = product.image; image.alt = product.name; image.loading = 'lazy'; image.width = 800; image.height = 800;
    image.addEventListener('error', () => missingImage(product, photoButton), { once: true }); photoButton.append(image);
  } else missingImage(product, photoButton);
  const openButton = element('a', 'text-button', 'Details ansehen'); openButton.href = productPath(product); openButton.setAttribute('aria-label', `${product.name}: Details ansehen`);
  const arrow = element('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); openButton.append(arrow);
  const prices = product.variants.map(variant => variant.priceMinor);
  const price = `${Math.min(...prices) !== Math.max(...prices) ? 'Ab ' : ''}${money(Math.min(...prices))}`;
  const fees = product.variants.flatMap(variant => availableShippingOptions(variant.shipping).map(option => option.costMinor));
  card.append(photoButton, element('p', 'product-status available', 'Verfügbar'), element('h3', '', product.name), element('p', 'product-subtitle', productSubtitle(product)), element('p', 'product-price', price), element('p', 'product-delivery', fees.length ? `Lieferung ab ${money(Math.min(...fees))}` : 'Liefergebühren werden abgefragt'), openButton); return card;
}
function render() {
  const selected = selectProducts(products, category, query, page); page = selected.page;
  $('#catalogue-title').textContent = CATEGORY_LABELS[category].title; $('#catalogue-description').textContent = CATEGORY_LABELS[category].description;
  document.querySelectorAll('[data-category]').forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.category === category)));
  if (!hasLoaded) { writeUrl(); return; }
  grid.replaceChildren(...selected.products.map(productCard)); grid.setAttribute('aria-busy', 'false');
  $('#results-count').textContent = `${selected.total} ${selected.total === 1 ? 'Modell' : 'Modelle'}${query ? ` für «${query}»` : ''}`;
  $('#empty-state').hidden = selected.total > 0; $('.pagination').hidden = selected.totalPages <= 1; $('#page-label').textContent = `${page} / ${selected.totalPages}`;
  $('#previous-page').disabled = page <= 1; $('#next-page').disabled = page >= selected.totalPages; writeUrl();
}
async function load() {
  if (loading) return; loading = true; grid.setAttribute('aria-busy', 'true'); $('#load-error').hidden = true; $('#empty-state').hidden = true; $('#results-count').textContent = 'Sortiment wird geladen …';
  try {
    const response = await fetch('/data/catalogue.json');
    if (!response.ok) throw new Error(`Catalogue ${response.status}`);
    const data = await response.json();
    if (data.mode !== 'preview' || !Array.isArray(data.products)) throw new Error('Invalid catalogue');
    products = data.products; hasLoaded = true; render();
    // Restore deep links after the catalogue has established the page height.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  catch { grid.replaceChildren(); grid.setAttribute('aria-busy', 'false'); $('#load-error').hidden = false; $('.pagination').hidden = true; $('#results-count').textContent = 'Sortiment derzeit nicht verfügbar'; }
  finally { loading = false; }
}
document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { category = button.dataset.category; query = ''; page = 1; search.value = ''; render(); }));
search.addEventListener('input', () => { query = search.value; page = 1; render(); }); $('.search').addEventListener('submit', (event) => event.preventDefault());
$('#reset-search').addEventListener('click', () => { search.value = ''; query = ''; page = 1; render(); search.focus(); }); $('#retry-load').addEventListener('click', load);
for (const [selector, direction] of [['#previous-page', -1], ['#next-page', 1]]) $(selector).addEventListener('click', () => { page += direction; render(); $('#sortiment').scrollIntoView({ block: 'start' }); });
$('.hero .button').addEventListener('click', () => { category = 'handhelds'; query = ''; page = 1; search.value = ''; render(); });
load();
