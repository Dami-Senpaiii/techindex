export async function api(path, { method = 'GET', body } = {}) {
  const response = await fetch(path, { method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : {}, ...(body ? { body: JSON.stringify(body) } : {}) });
  let data; try { data = await response.json(); } catch { throw new Error('Der Kontodienst ist gerade nicht erreichbar. Bitte versuche es erneut.'); }
  if (!response.ok) {
    const messages = { INVALID_EMAIL_OR_PASSWORD: 'E-Mail oder Passwort ist nicht korrekt.', USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL: 'Diese E-Mail-Adresse ist bereits registriert.', USER_ALREADY_EXISTS: 'Diese E-Mail-Adresse ist bereits registriert.', PASSWORD_TOO_SHORT: 'Bitte verwende mindestens 12 Zeichen.', INVALID_PASSWORD: 'Das aktuelle Passwort ist nicht korrekt.', SESSION_EXPIRED: 'Bitte melde dich erneut an.' };
    throw new Error(response.status === 429 ? 'Zu viele Versuche. Bitte warte etwas und versuche es erneut.' : messages[data.code] || data.error || (response.status === 401 ? 'Bitte melde dich erneut an.' : 'Die Änderung konnte nicht gespeichert werden. Bitte prüfe deine Angaben.'));
  }
  return data;
}
export function element(tag, className, text) { const node = document.createElement(tag); if (className) node.className = className; if (text !== undefined) node.textContent = text; return node; }
export let currentUser = null;
export let sessionError = null;
export const sessionReady = api('/api/auth/get-session').then(data => { currentUser = data?.user || null; return currentUser; }).catch(error => { sessionError = error; return null; });
