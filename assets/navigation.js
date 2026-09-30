import { sessionReady } from './session.js';
import './cart-store.js';
const toggle = document.querySelector('.menu-toggle');
const navigation = document.querySelector('#navigation');
function closeMenu() { toggle?.setAttribute('aria-expanded', 'false'); navigation?.classList.remove('is-open'); }
toggle?.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('is-open', open); });
navigation?.addEventListener('click', event => { if (event.target.closest('a')) closeMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
sessionReady.then(user => { document.querySelectorAll('[data-account-label]').forEach(node => node.textContent = user ? 'Mein Profil' : 'Login / Registrieren'); });
