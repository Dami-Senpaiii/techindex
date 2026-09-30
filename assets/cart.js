import { money, subtotal, shippingChoices, transit } from './commerce.js';
import { element, currentUser, sessionReady } from './session.js';
import { cartReady, cartEvents, getCart, changeCart } from './cart-store.js';
const $ = selector => document.querySelector(selector);
function message(text, error = false) { $('#cart-message').textContent = text; $('#cart-message').classList.toggle('is-error', error); }
function render() {
  const items = getCart(); $('#cart-loading').hidden = true; $('#cart-empty').hidden = items.length > 0; $('#cart-content').hidden = items.length === 0;
  $('#cart-items').replaceChildren(); $('#cart-subtotal').textContent = money(subtotal(items)); const count = items.reduce((sum, item) => sum + item.quantity, 0); $('#cart-quantity').textContent = `${count} ${count === 1 ? 'Artikel' : 'Artikel'}`;
  for (const item of items) {
    const row = element('article', 'cart-row'); const photo = element('a', 'cart-photo'); photo.href = item.url; photo.setAttribute('aria-label', `${item.name} ansehen`); if (item.image) { const image = element('img'); image.src = item.image; image.alt = item.name; photo.append(image); }
    const info = element('div', 'cart-info'); const title = element('h2'); const productLink = element('a', '', item.name); productLink.href = item.url; title.append(productLink); info.append(title, element('p', 'muted', item.variant), element('p', 'cart-availability', 'Verfügbar'));
    const choices = shippingChoices(item.shipping);
    for (const [key, label] of [['cheapest', item.shipping.complete ? 'Günstigste Lieferung' : 'Hinterlegte Lieferung'], ['fastest', 'Schnellste Lieferung']]) {
      const option = choices[key]; info.append(element('p', 'cart-shipping', option ? `${label}: ${money(option.costMinor)} · ${option.method}, ${transit(option)} (für ${item.shipping.quantity} Stück)` : `${label}: Tarif noch offen`));
    }
    info.append(element('p', 'cart-shipping', `Bearbeitungsdauer: ${item.shipping.processingDays ? `${item.shipping.processingDays.join('–')} Tage` : 'Wird bestätigt'}`));
    const controls = element('div', 'cart-controls'); const minus = element('button', '', '−'); minus.type = 'button'; minus.setAttribute('aria-label', `Menge für ${item.name} verringern`); minus.disabled = item.quantity <= 1;
    const input = element('input'); input.type = 'number'; input.min = '1'; input.max = '99'; input.step = '1'; input.value = String(item.quantity); input.setAttribute('aria-label', `Menge für ${item.name}`);
    const plus = element('button', '', '+'); plus.type = 'button'; plus.setAttribute('aria-label', `Menge für ${item.name} erhöhen`); plus.disabled = item.quantity >= 99;
    const remove = element('button', 'remove-item', 'Entfernen'); remove.type = 'button'; remove.setAttribute('aria-label', `${item.name} aus Warenkorb entfernen`);
    const update = async quantity => {
      row.querySelectorAll('button,input').forEach(node => node.disabled = true);
      try { await changeCart(item.sku, quantity); message(quantity === 0 ? 'Artikel entfernt.' : 'Warenkorb aktualisiert.'); }
      catch (error) { render(); message(error.message, true); }
    };
    minus.addEventListener('click', () => update(item.quantity - 1)); plus.addEventListener('click', () => update(item.quantity + 1)); remove.addEventListener('click', () => update(0));
    input.addEventListener('change', () => { if (!input.checkValidity() || !input.value) { input.value = item.quantity; input.reportValidity(); return; } update(Number(input.value)); });
    controls.append(minus, input, plus); const actions = element('div', 'cart-actions'); actions.append(controls, remove); row.append(photo, info, actions, element('p', 'cart-price', money(item.priceMinor))); $('#cart-items').append(row);
  }
}
cartEvents.addEventListener('change', render);
cartReady.then(render).catch(error => { $('#cart-loading').hidden = true; message(error.message, true); $('#retry-cart').hidden = false; });
sessionReady.then(user => { $('#cart-account-note').hidden = !!user; $('#cart-saved-note').hidden = !user; });
$('#retry-cart').addEventListener('click', () => location.reload());
