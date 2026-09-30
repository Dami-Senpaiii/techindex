import { getAuth } from '../../server/auth.js';
import { checkOrigin, json, readBody, fail, privateResponse } from '../../server/http.js';
import { cartItems, validateLines, validateProfile } from '../../server/shop.js';
export async function onRequest({ request, env }) {
  try {
    checkOrigin(request);
    const auth = getAuth(env, request);
    const session = await auth.api.getSession({ headers: request.headers });
    if (!session) return json({ error: 'Bitte melde dich an.' }, 401);
    const userId = session.user.id;
    const url = new URL(request.url);
    const resource = url.searchParams.get('resource');
    if (!['cart', 'profile', 'email', 'orders'].includes(resource)) return json({ error: 'Nicht gefunden.' }, 404);
    if (request.method !== 'GET') {
      const window = Math.floor(Date.now() / 60000);
      const limit = await env.SHOP_DB.prepare('INSERT INTO shop_request_limit(user_id, resource, window, count) VALUES (?, ?, ?, 1) ON CONFLICT(user_id, resource) DO UPDATE SET window = excluded.window, count = CASE WHEN shop_request_limit.window = excluded.window THEN shop_request_limit.count + 1 ELSE 1 END RETURNING count').bind(userId, resource, window).first();
      if (limit.count > (resource === 'email' ? 5 : 60)) return json({ error: 'Zu viele Änderungen. Bitte warte eine Minute.' }, 429);
    }
    if (resource === 'cart') {
      if (request.method === 'PUT') {
        const lines = validateLines((await readBody(request)).items);
        await env.SHOP_DB.batch([
          env.SHOP_DB.prepare('DELETE FROM cart_item WHERE user_id = ?').bind(userId),
          ...lines.map(line => env.SHOP_DB.prepare('INSERT INTO cart_item(user_id, sku, quantity) VALUES (?, ?, ?)').bind(userId, line.sku, line.quantity))
        ]);
      } else if (request.method !== 'GET') return json({ error: 'Methode nicht erlaubt.' }, 405);
      const { results } = await env.SHOP_DB.prepare('SELECT sku, quantity FROM cart_item WHERE user_id = ? ORDER BY sku').bind(userId).all();
      return json({ items: cartItems(results) });
    }
    if (resource === 'profile') {
      if (request.method === 'PUT') {
        const data = validateProfile(await readBody(request));
        await env.SHOP_DB.batch([
          env.SHOP_DB.prepare('INSERT INTO customer_profile(user_id, data) VALUES (?, ?) ON CONFLICT(user_id) DO UPDATE SET data = excluded.data').bind(userId, JSON.stringify(data)),
          env.SHOP_DB.prepare('UPDATE user SET name = ?, updatedAt = ? WHERE id = ?').bind(`${data.firstName} ${data.lastName}`, new Date().toISOString(), userId)
        ]);
        return json({ profile: data });
      }
      if (request.method !== 'GET') return json({ error: 'Methode nicht erlaubt.' }, 405);
      const row = await env.SHOP_DB.prepare('SELECT data FROM customer_profile WHERE user_id = ?').bind(userId).first();
      return json({ profile: row ? JSON.parse(row.data) : { firstName: session.user.name.split(' ')[0], lastName: session.user.name.split(' ').slice(1).join(' '), phone: '', street: '', addressExtra: '', postalCode: '', city: '', country: 'CH' } });
    }
    if (resource === 'email' && request.method === 'POST') {
      const { newEmail, password } = await readBody(request);
      if (typeof password !== 'string' || password.length > 128 || typeof newEmail !== 'string' || newEmail.length > 254) return json({ error: 'Bitte prüfe E-Mail und Passwort.' }, 400);
      try { await auth.api.verifyPassword({ body: { password }, headers: request.headers }); }
      catch { return json({ error: 'Das aktuelle Passwort ist nicht korrekt.' }, 400); }
      const result = await auth.api.changeEmail({ body: { newEmail }, headers: request.headers, asResponse: true });
      return privateResponse(result);
    }
    if (resource === 'orders' && request.method === 'GET') {
      const page = Math.min(100000, Math.max(1, Number.parseInt(url.searchParams.get('page'), 10) || 1));
      const { results } = await env.SHOP_DB.prepare('SELECT id, order_number, status, total_minor, currency, created_at, items FROM shop_order WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 11 OFFSET ?').bind(userId, (page - 1) * 10).all();
      return json({ orders: results.slice(0, 10).map(row => ({ ...row, items: JSON.parse(row.items) })), hasMore: results.length > 10, page });
    }
    return json({ error: 'Nicht gefunden.' }, 404);
  } catch (error) { return fail(error); }
}
