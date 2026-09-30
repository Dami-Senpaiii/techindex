import { money, transit, shippingChoices } from './commerce.js';
import { changeCart } from './cart-store.js';
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
let featuredProduct;
let heroVariant;
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
  const openButton = element('button', 'text-button', 'Details ansehen'); openButton.type = 'button'; openButton.setAttribute('aria-label', `${product.name}: Details ansehen`);
  const arrow = element('span', '', '↗'); arrow.setAttribute('aria-hidden', 'true'); openButton.append(arrow);
  for (const button of [photoButton, openButton]) button.addEventListener('click', () => openProduct(product, button));
  const prices = product.variants.map(variant => variant.priceMinor);
  const price = `${Math.min(...prices) !== Math.max(...prices) ? 'Ab ' : ''}${money(Math.min(...prices))}`;
  const fees = product.variants.flatMap(variant => variant.shipping.options.map(option => option.costMinor));
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
function updateVariant() {
  $('#cart-feedback').hidden = true; $('#view-cart').hidden = true;
  const variant = activeProduct.variants[Number($('#detail-variant').value)];
  const image = $('#detail-image');
  $('#detail-image-error').hidden = true; image.hidden = false; image.alt = variant.name;
  image.src = variant.image || activeProduct.image;
  $('#detail-price').textContent = money(variant.priceMinor);
  const shipping = variant.shipping; const choices = shippingChoices(shipping);
  const shippingRows = [];
  for (const [key, label] of [['cheapest', shipping.complete ? 'Günstigste Lieferung' : 'Hinterlegte Lieferung'], ['fastest', 'Schnellste Lieferung']]) {
    const option = choices[key]; const row = element('div', 'shipping-option');
    const heading = element('div', 'shipping-option-heading'); heading.append(element('strong', '', label), element('strong', '', option ? money(option.costMinor) : 'Noch offen'));
    row.append(heading, element('p', '', option ? `${option.method} · ${transit(option)}${shipping.quantity > 1 ? ` (für ${shipping.quantity} Stück)` : ''}` : 'Für diese Versandoption liegt aktuell kein Tarif vor.'));
    shippingRows.push(row);
  }
  const processing = element('div', 'shipping-option shipping-option-heading');
  processing.append(element('strong', '', 'Bearbeitungsdauer'), element('strong', '', shipping.processingDays ? `${shipping.processingDays.join('–')} Tage` : 'Wird bestätigt'));
  $('#detail-shipping').replaceChildren(...shippingRows, processing);
  const details = variant.details || activeProduct.details; const content = $('#detail-specifications'); content.replaceChildren();
  for (const paragraph of details.paragraphs) content.append(element('p', '', paragraph));
  const facts = element('dl', 'detail-specs');
  const memoryFacts = variant.memory ? [['Arbeitsspeicher', `${variant.ramGB} GB RAM`], ['Interner Speicher', variant.storage], ['Farbe', variant.color]] : [];
  for (const [name, value] of [...memoryFacts, ...details.specifications, ['Ausführung', variant.name], ['Artikelnummer', variant.sku]]) { const row = element('div'); row.append(element('dt', '', name), element('dd', '', value)); facts.append(row); }
  content.append(facts);
  if (details.included?.length) { content.append(element('h4', '', 'Lieferumfang')); const list = element('ul'); for (const part of details.included) list.append(element('li', '', part)); content.append(list); }
  content.append(element('p', 'detail-note', 'Unterstützte Funktionen hängen vom angeschlossenen Gerät und der Software ab.'));

}
function openProduct(product, opener, sku = product.defaultSku) {
  activeProduct = product; lastOpener = opener; $('#detail-title').textContent = product.name; $('#detail-description').textContent = productSubtitle(product);
  $('#detail-variant').replaceChildren(...product.variants.map((variant, index) => { const option = element('option', '', variant.name.replace(product.name + ' · ', '')); option.value = String(index); return option; }));
  const index = product.variants.findIndex(variant => variant.sku === sku); $('#detail-variant').value = String(Math.max(0, index));
  $('.product-details').open = false; $('#cart-feedback').hidden = true; $('#view-cart').hidden = true; updateVariant(); dialog.showModal(); $('.close-dialog').focus();
}
function renderHero() {
  featuredProduct = products.find(product => product.featured);
  if (!featuredProduct) throw new Error('Featured product missing');
  heroVariant = featuredProduct.variants.find(variant => variant.sku === featuredProduct.defaultSku) || featuredProduct.variants[0];
  const memories = [...new Map(featuredProduct.variants.map(variant => [variant.memory, variant])).values()];
  $('#hero-memory').replaceChildren(...memories.map(variant => {
    const label = element('label', 'memory-choice'); const input = element('input'); input.type = 'radio'; input.name = 'hero-memory'; input.value = variant.memory; input.checked = variant.memory === heroVariant.memory; input.setAttribute('aria-label', `${variant.storage} Speicher, ${variant.ramGB} GB RAM`);
    const text = element('span'); text.append(element('strong', '', variant.storage), element('small', '', `${variant.ramGB} GB RAM`)); label.append(input, text);
    input.addEventListener('change', () => { const options = featuredProduct.variants.filter(v => v.memory === input.value); heroVariant = options.find(v => v.color === heroVariant.color) || options[0]; updateHero(); }); return label;
  }));
  $('#hero-color').disabled = false; $('#hero-add').disabled = false; $('#hero-details').disabled = false; $('#hero-configurator').setAttribute('aria-busy', 'false');
  updateHero();
}
function updateHero() {
  $('#hero-feedback').hidden = true; $('#hero-view-cart').hidden = true;
  const options = featuredProduct.variants.filter(v => v.memory === heroVariant.memory);
  $('#hero-color').replaceChildren(...options.map(variant => { const option = element('option', '', variant.color); option.value = variant.sku; option.selected = variant.sku === heroVariant.sku; return option; }));
  const image = $('#hero-product-image'); image.alt = heroVariant.name; image.src = heroVariant.image || featuredProduct.image;
  $('#hero-price').textContent = money(heroVariant.priceMinor); $('#hero-availability').hidden = false;
}
async function load() {
  if (loading) return; loading = true; grid.setAttribute('aria-busy', 'true'); $('#load-error').hidden = true; $('#empty-state').hidden = true; $('#results-count').textContent = 'Sortiment wird geladen …';
  try {
    const response = await fetch('/data/catalogue.json');
    if (!response.ok) throw new Error(`Catalogue ${response.status}`);
    const data = await response.json();
    if (data.mode !== 'preview' || !Array.isArray(data.products)) throw new Error('Invalid catalogue');
    products = data.products; hasLoaded = true; render(); renderHero();
    // Restore deep links after the catalogue has established the page height.
    if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  catch { grid.replaceChildren(); grid.setAttribute('aria-busy', 'false'); $('#load-error').hidden = false; $('.pagination').hidden = true; $('#results-count').textContent = 'Sortiment derzeit nicht verfügbar'; $('#hero-price').textContent = 'Preis derzeit nicht verfügbar'; $('#hero-configurator').setAttribute('aria-busy', 'false'); }
  finally { loading = false; }
}
document.querySelectorAll('[data-category]').forEach((button) => button.addEventListener('click', () => { category = button.dataset.category; query = ''; page = 1; search.value = ''; render(); }));
search.addEventListener('input', () => { query = search.value; page = 1; render(); }); $('.search').addEventListener('submit', (event) => event.preventDefault());
$('#reset-search').addEventListener('click', () => { search.value = ''; query = ''; page = 1; render(); search.focus(); }); $('#retry-load').addEventListener('click', load);
for (const [selector, direction] of [['#previous-page', -1], ['#next-page', 1]]) $(selector).addEventListener('click', () => { page += direction; render(); $('#sortiment').scrollIntoView({ block: 'start' }); });
$('#detail-variant').addEventListener('change', updateVariant); $('.close-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => { const rect = dialog.getBoundingClientRect(); if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) dialog.close(); });
dialog.addEventListener('close', () => lastOpener?.focus());
$('#discover-handhelds').addEventListener('click', () => { category = 'handhelds'; query = ''; page = 1; search.value = ''; render(); });
$('#detail-image').addEventListener('error', () => { $('#detail-image').hidden = true; $('#detail-image-error').hidden = false; });
$('#hero-color').addEventListener('change', () => { heroVariant = featuredProduct.variants.find(v => v.sku === $('#hero-color').value); updateHero(); });
$('#hero-details').addEventListener('click', event => openProduct(featuredProduct, event.currentTarget, heroVariant.sku));
load();

async function addSelection(button, sku, message, viewCart) {
  button.disabled = true; viewCart.hidden = true;
  message.hidden = false; message.classList.remove('is-error'); message.textContent = 'Wird gespeichert …';
  try { await changeCart(sku, 1, true); message.textContent = 'Deine Auswahl ist im Warenkorb.'; viewCart.hidden = false; }
  catch (error) { message.textContent = error.message; message.classList.add('is-error'); }
  finally { button.disabled = false; }
}
$('#add-to-cart').addEventListener('click', event => addSelection(event.currentTarget, activeProduct.variants[Number($('#detail-variant').value)].sku, $('#cart-feedback'), $('#view-cart')));
$('#hero-add').addEventListener('click', event => addSelection(event.currentTarget, heroVariant.sku, $('#hero-feedback'), $('#hero-view-cart')));
