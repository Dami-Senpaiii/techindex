import { money, transit, shippingChoices } from './commerce.js';
import { changeCart } from './cart-store.js';
import { selectVariant } from './catalogue.js';
const $ = selector => document.querySelector(selector);
let activeProduct;
let activeVariant;
function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text) node.textContent = text; return node; }
function updateVariant() {
  $('#cart-feedback').hidden = true; $('#view-cart').hidden = true;
  const variant = activeVariant;
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
  const memoryFacts = variant.memory ? [['Arbeitsspeicher', `${variant.ramGB} GB RAM`], ['Interner Speicher', variant.storage]] : [];
  for (const [name, value] of [...memoryFacts, ...details.specifications, ['Ausführung', variant.name], ['Artikelnummer', variant.sku]]) { const row = element('div'); row.append(element('dt', '', name), element('dd', '', value)); facts.append(row); }
  content.append(facts);
  if (details.included?.length) { content.append(element('h4', '', 'Lieferumfang')); const list = element('ul'); for (const part of details.included) list.append(element('li', '', part)); content.append(list); }
  content.append(element('p', 'detail-note', 'Unterstützte Funktionen hängen vom angeschlossenen Gerät und der Software ab.'));

}
function updateVariantOptions(hardware, color) {
  activeVariant = selectVariant(activeProduct, hardware, color);
  const hardwareOptions = [...new Map(activeProduct.variants.map(variant => [variant.hardware || 'Standard', variant])).entries()];
  $('#detail-hardware-field').hidden = hardwareOptions.length <= 1;
  $('#detail-hardware').replaceChildren(...hardwareOptions.map(([value, variant]) => {
    const option = element('option', '', variant.ramGB ? `${variant.ramGB} GB RAM / ${variant.storage}` : value);
    option.value = value; option.selected = value === hardware; return option;
  }));
  const colors = activeProduct.variants.filter(variant => (variant.hardware || 'Standard') === hardware && variant.color);
  $('#detail-color-field').hidden = colors.length <= 1;
  $('#detail-color').replaceChildren(...colors.map(variant => {
    const option = element('option', '', variant.color); option.value = variant.color;
    option.selected = variant.sku === activeVariant.sku; return option;
  }));
  updateVariant();
  $('#selected-variant').textContent = activeVariant.name.replace(activeProduct.name + ' · ', '');
  const url = new URL(location.href);
  if (activeVariant.sku === (activeProduct.defaultSku || activeProduct.variants[0].sku)) url.searchParams.delete('sku');
  else url.searchParams.set('sku', activeVariant.sku);
  history.replaceState(null, '', url);
}
async function addSelection(button, sku, message, viewCart) {
  button.disabled = true; viewCart.hidden = true;
  message.hidden = false; message.classList.remove('is-error'); message.textContent = 'Wird gespeichert …';
  try { await changeCart(sku, 1, true); message.textContent = 'Deine Auswahl ist im Warenkorb.'; viewCart.hidden = false; }
  catch (error) { message.textContent = error.message; message.classList.add('is-error'); }
  finally { button.disabled = false; }
}
$('#add-to-cart').addEventListener('click', event => addSelection(event.currentTarget, activeVariant.sku, $('#cart-feedback'), $('#view-cart')));

$('#detail-hardware').addEventListener('change', () => updateVariantOptions($('#detail-hardware').value, activeVariant.color));
$('#detail-color').addEventListener('change', () => updateVariantOptions($('#detail-hardware').value, $('#detail-color').value));
$('#detail-image').addEventListener('error', () => { $('#detail-image').hidden = true; $('#detail-image-error').hidden = false; });
function restoreSelection() {
  const sku = new URLSearchParams(location.search).get('sku')?.toUpperCase();
  const variant = activeProduct.variants.find(variant => variant.sku === sku)
    || activeProduct.variants.find(variant => variant.sku === activeProduct.defaultSku) || activeProduct.variants[0];
  updateVariantOptions(variant.hardware || 'Standard', variant.color);
}
async function loadProduct() {
  $('#product-load-error').hidden = true;
  try {
    const response = await fetch(`/data/products/${document.body.dataset.productId}.json`);
    if (!response.ok) throw new Error('Product unavailable');
    activeProduct = await response.json();
    restoreSelection();
    $('#product-controls').hidden = false;
    $('#add-to-cart').disabled = false;
  } catch { $('#product-load-error').hidden = false; }
}
$('#retry-product').addEventListener('click', loadProduct);
window.addEventListener('popstate', () => { if (activeProduct) restoreSelection(); });
loadProduct();
