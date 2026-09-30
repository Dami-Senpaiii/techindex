import { api, currentUser, sessionReady } from './session.js';
const storageKey = 'techindex.guest-cart.v1';
let items = [];
let catalogue;
let pending = Promise.resolve();
export const cartEvents = new EventTarget();
function guestRead() { try { const stored = JSON.parse(localStorage.getItem(storageKey) || '[]'); return Array.isArray(stored) ? stored : []; } catch { return []; } }
function saveGuest(lines) { try { localStorage.setItem(storageKey, JSON.stringify(lines.map(({ sku, quantity }) => ({ sku, quantity })))); } catch { throw new Error('Dein Browser kann den Warenkorb nicht speichern. Bitte erlaube Website-Daten.'); } }
function clean(lines) {
  const found = new Map();
  for (const line of lines.slice(0, 100)) if (catalogue.has(line?.sku) && Number.isInteger(line.quantity) && line.quantity > 0) found.set(line.sku, { ...catalogue.get(line.sku), quantity: Math.min(99, line.quantity) });
  return [...found.values()];
}
function changed() { document.querySelectorAll('[data-cart-count]').forEach(node => node.textContent = String(items.reduce((sum, item) => sum + item.quantity, 0))); cartEvents.dispatchEvent(new Event('change')); }
export const cartReady = (async () => {
  const response = await fetch('/data/catalogue.json'); if (!response.ok) throw new Error('Das Sortiment konnte nicht geladen werden.');
  const data = await response.json();
  catalogue = new Map(data.products.flatMap(product => product.variants.map(variant => [variant.sku, { sku: variant.sku, name: product.name, variant: variant.name.replace(product.name + ' · ', ''), image: product.image, status: product.status }])));
  await sessionReady;
  const guest = clean(guestRead());
  if (currentUser) {
    const saved = (await api('/api/shop?resource=cart')).items;
    const merged = new Map(clean(saved).map(item => [item.sku, item]));
    for (const item of guest) merged.set(item.sku, { ...item, quantity: Math.min(99, item.quantity + (merged.get(item.sku)?.quantity || 0)) });
    items = [...merged.values()];
    if (guest.length) { items = (await api('/api/shop?resource=cart', { method: 'PUT', body: { items: items.map(({ sku, quantity }) => ({ sku, quantity })) } })).items; saveGuest([]); }
  } else items = guest;
  changed(); return items;
})();
// Consumers handle load failures visibly; prevent unhandled rejections on non-cart pages.
cartReady.catch(() => {});
export function getCart() { return items.map(item => ({ ...item })); }
export function changeCart(sku, quantity, add = false) {
  const action = pending.catch(() => {}).then(async () => {
    await cartReady;
    if (!catalogue.has(sku) || !Number.isInteger(quantity) || quantity < 0 || quantity > 99) throw new Error('Bitte wähle eine gültige Menge.');
    const next = getCart(); const index = next.findIndex(item => item.sku === sku);
    if (add) quantity = Math.min(99, quantity + (next[index]?.quantity || 0));
    if (quantity === 0) { if (index >= 0) next.splice(index, 1); }
    else if (index >= 0) next[index].quantity = quantity;
    else { if (next.length >= 100) throw new Error('Dein Warenkorb ist voll.'); next.push({ ...catalogue.get(sku), quantity }); }
    if (currentUser) items = (await api('/api/shop?resource=cart', { method: 'PUT', body: { items: next.map(({ sku, quantity }) => ({ sku, quantity })) } })).items;
    else { saveGuest(next); items = next; }
    changed();
  });
  pending = action; return action;
}
window.addEventListener('storage', event => { if (event.key === storageKey && catalogue && !currentUser) { items = clean(guestRead()); changed(); } });
