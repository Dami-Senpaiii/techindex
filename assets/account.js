import { api, sessionReady, sessionError, element } from './session.js';
import { cartReady } from './cart-store.js';
const $ = selector => document.querySelector(selector);
let user, ordersPage = 1;
function status(node, text, error = false) { node.textContent = text; node.classList.toggle('is-error', error); node.hidden = !text; }
function busy(form, value) { form.querySelector('button[type=submit]').disabled = value; form.setAttribute('aria-busy', String(value)); }
function selectSection() {
  const id = location.hash.slice(1); const selected = ['bestellungen','daten','sicherheit','zahlungsmethoden'].includes(id) ? id : 'bestellungen';
  document.querySelectorAll('[data-profile-section]').forEach(node => node.hidden = node.id !== selected);
  document.querySelectorAll('.account-navigation a').forEach(node => { if (node.hash === '#' + selected) node.setAttribute('aria-current', 'page'); else node.removeAttribute('aria-current'); });
}
function authMode(mode) { const register = mode === 'registrieren'; $('#login-form').hidden = register; $('#register-form').hidden = !register; document.querySelectorAll('[data-auth-mode]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.authMode === mode))); $('#auth-title').textContent = register ? 'Dein TechIndex-Konto.' : 'Willkommen zurück.'; }
document.querySelectorAll('[data-auth-mode]').forEach(button => button.addEventListener('click', () => authMode(button.dataset.authMode)));
for (const mode of ['login', 'register']) {
  const form = $('#' + mode + '-form');
  form.addEventListener('submit', async event => {
    event.preventDefault(); const fields = Object.fromEntries(new FormData(form)); const output = form.querySelector('[role=status]');
    if (mode === 'register' && fields.password !== fields.confirmPassword) { status(output, 'Die Passwörter stimmen nicht überein.', true); return; }
    busy(form, true); status(output, '');
    try {
      const body = mode === 'register' ? { name: `${fields.firstName.trim()} ${fields.lastName.trim()}`, email: fields.email.trim(), password: fields.password } : { email: fields.email.trim(), password: fields.password };
      await api('/api/auth/' + (mode === 'register' ? 'sign-up/email' : 'sign-in/email'), { method: 'POST', body });
      history.replaceState(null, '', '/konto#bestellungen'); location.reload();
    } catch (error) { status(output, error.message, true); busy(form, false); }
  });
}
$('#logout').addEventListener('click', async () => { $('#logout').disabled = true; try { await api('/api/auth/sign-out', { method: 'POST', body: {} }); history.replaceState(null, '', '/konto'); location.reload(); } catch (error) { status($('#account-message'), error.message, true); $('#logout').disabled = false; } });
$('#profile-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; busy(form, true);
  try { const fields = Object.fromEntries(new FormData(form)); await api('/api/shop?resource=profile', { method: 'PUT', body: fields }); $('#profile-name').textContent = `${fields.firstName} ${fields.lastName}`; status($('#profile-message'), 'Deine Daten wurden gespeichert.'); }
  catch (error) { status($('#profile-message'), error.message, true); } finally { busy(form, false); }
});
$('#password-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; const fields = Object.fromEntries(new FormData(form));
  if (fields.newPassword !== fields.confirmPassword) { status($('#password-message'), 'Die neuen Passwörter stimmen nicht überein.', true); return; }
  busy(form, true);
  try { await api('/api/auth/change-password', { method: 'POST', body: { currentPassword: fields.currentPassword, newPassword: fields.newPassword, revokeOtherSessions: true } }); form.reset(); status($('#password-message'), 'Passwort geändert. Andere Sitzungen wurden abgemeldet.'); }
  catch (error) { status($('#password-message'), error.message, true); } finally { busy(form, false); }
});
$('#email-form').addEventListener('submit', async event => {
  event.preventDefault(); const form = event.currentTarget; busy(form, true);
  try { const fields = Object.fromEntries(new FormData(form)); await api('/api/shop?resource=email', { method: 'POST', body: fields }); $('#profile-email').textContent = fields.newEmail; form.reset(); status($('#email-message'), 'Deine Login-E-Mail wurde geändert.'); }
  catch (error) { status($('#email-message'), error.message, true); } finally { busy(form, false); }
});
const orderStatus = { pending: 'Offen', paid: 'Bezahlt', processing: 'In Bearbeitung', shipped: 'Versendet', completed: 'Abgeschlossen', cancelled: 'Storniert', refunded: 'Erstattet' };
const money = (minor, currency = 'CHF') => new Intl.NumberFormat('de-CH', { style: 'currency', currency }).format(minor / 100);
async function loadOrders() {
  status($('#orders-message'), 'Bestellungen werden geladen …'); $('#orders-pagination').hidden = true;
  try {
    const data = await api('/api/shop?resource=orders&page=' + ordersPage); $('#order-list').replaceChildren();
    $('#orders-empty').hidden = data.orders.length > 0;
    for (const order of data.orders) {
      const row = element('details', 'order-row'); const summary = element('summary');
      const title = element('div'); title.append(element('strong', '', 'Bestellung ' + order.order_number), element('span', 'muted', new Intl.DateTimeFormat('de-CH', { dateStyle: 'medium' }).format(new Date(order.created_at))));
      summary.append(title, element('span', 'order-status', orderStatus[order.status] || order.status), element('strong', '', money(order.total_minor, order.currency)), element('span', 'order-expand', '+'));
      const list = element('ul', 'order-items');
      for (const item of order.items) { const line = element('li'); line.append(element('span', '', `${item.quantity} × ${item.name}${item.variant ? ' · ' + item.variant : ''}`), element('strong', '', money(item.unit_minor * item.quantity, order.currency))); list.append(line); }
      row.append(summary, list); $('#order-list').append(row);
    }
    $('#orders-pagination').hidden = ordersPage === 1 && !data.hasMore; $('#orders-prev').disabled = ordersPage <= 1; $('#orders-next').disabled = !data.hasMore; $('#orders-page').textContent = `Seite ${ordersPage}`;
    status($('#orders-message'), '');
  } catch (error) { $('#orders-empty').hidden = true; status($('#orders-message'), error.message, true); $('#retry-orders').hidden = false; }
}
$('#retry-orders').addEventListener('click', () => { $('#retry-orders').hidden = true; loadOrders(); });
$('#orders-prev').addEventListener('click', () => { ordersPage--; loadOrders(); }); $('#orders-next').addEventListener('click', () => { ordersPage++; loadOrders(); });
window.addEventListener('hashchange', selectSection);
(async () => {
  user = await sessionReady; $('#account-loading').hidden = true;
  if (sessionError) { status($('#account-message'), sessionError.message, true); $('#retry-account').hidden = false; return; }
  if (!user) { $('#auth-area').hidden = false; authMode(location.hash === '#registrieren' ? 'registrieren' : 'login'); return; }
  $('#profile-area').hidden = false; $('#profile-name').textContent = user.name; $('#profile-email').textContent = user.email; selectSection();
  cartReady.catch(error => status($('#account-message'), 'Der Warenkorb konnte nicht synchronisiert werden: ' + error.message, true));
  loadOrders();
  try { const { profile } = await api('/api/shop?resource=profile'); for (const [key, value] of Object.entries(profile)) { const field = $('#profile-form').elements.namedItem(key); if (field) field.value = value; } $('#profile-form').querySelector('fieldset').disabled = false; }
  catch (error) { status($('#profile-message'), error.message, true); $('#retry-profile').hidden = false; }
})();
$('#retry-account').addEventListener('click', () => location.reload()); $('#retry-profile').addEventListener('click', () => location.reload());
