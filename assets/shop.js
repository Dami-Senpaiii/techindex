import { CATEGORY_LABELS, productSubtitle, selectProducts } from './catalogue.js';
const $ = (selector) => document.querySelector(selector);
const grid = $('#products');
const search = $('#model-search');
const dialog = $('#product-dialog');
const params = new URLSearchParams(location.search);
let category = Object.hasOwn(CATEGORY_LABELS, params.get('kategorie')) ? params.get('kategorie') : 'handhelds';
let query = (params.get('suche') || '').slice(0, 100);
let page = Number.parseInt(params.get('seite'), 10) || 1;
let products = [];
let activeProduct;
let lastOpener;
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
  const photoButton = element('button', 'product-image'); photoButton.type = 'button'; photoButton.setAttribute('aria-label', `${product.name} ansehen`);
  if (product.image) {
    const image = element('img'); image.src = product.image; image.alt = product.name; image.loading = 'lazy'; image.width = 800; image.height = 800;
    image.addEventListener('error', () => missingImage(product, photoButton), { once: true }); photoButton.append(image);
  } else missingImage(product, photoButton);
  const openButton = element('button', 'text-button', 'Gerät ansehen'); openButton.type = 'button'; openButton.setAttribute('aria-label', `${product.name}: Gerät ansehen`);
  const arrow = element('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); openButton.append(arrow);
  for (const button of [photoButton, openButton]) button.addEventListener('click', () => openProduct(product, button));
  card.append(photoButton, element('p', 'product-status', 'Sortiment in Vorbereitung'), element('h3', '', product.name), element('p', 'product-subtitle', productSubtitle(product)), openButton); return card;
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
function updateVariant() {
  const variant = activeProduct.variants[Number($('#detail-variant').value)]; const link = $('#supplier-link'); const url = new URL(variant.source);
  if (url.protocol === 'https:' && url.hostname === 'www.tvcmall.com') link.href = url.href; else link.removeAttribute('href');
}
function openProduct(product, opener) {
  activeProduct = product; lastOpener = opener; $('#detail-title').textContent = product.name; $('#detail-description').textContent = productSubtitle(product);
  const image = $('#detail-image'); image.hidden = !product.image; image.alt = `Produktabbildung ${product.name}`; if (product.image) image.src = product.image; else image.removeAttribute('src');
  $('#detail-variant').replaceChildren(...product.variants.map((variant, index) => { const option = element('option', '', variant.name.replace(product.name + ' · ', '')); option.value = String(index); return option; }));
  updateVariant(); dialog.showModal(); $('.close-dialog').focus();
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
$('#detail-variant').addEventListener('change', updateVariant); $('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close(); });
dialog.addEventListener('close', () => lastOpener?.focus());
const menuToggle = $('.menu-toggle'); function closeMenu() { menuToggle.setAttribute('aria-expanded', 'false'); $('#navigation').classList.remove('is-open'); }
menuToggle.addEventListener('click', () => { const opened = menuToggle.getAttribute('aria-expanded') !== 'true'; menuToggle.setAttribute('aria-expanded', String(opened)); $('#navigation').classList.toggle('is-open', opened); });
$('#navigation').addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); }); document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeMenu(); });
$('.hero .button').addEventListener('click', () => { category = 'handhelds'; query = ''; page = 1; search.value = ''; render(); }); load();
