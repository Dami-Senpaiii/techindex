import { getAuth } from '../../../server/auth.js';
import { checkOrigin, json, privateResponse, fail, readBody } from '../../../server/http.js';
const allowed = new Set(['get-session', 'sign-up/email', 'sign-in/email', 'sign-out', 'change-password']);
export async function onRequest({ request, env }) {
  try {
    checkOrigin(request);
    const path = new URL(request.url).pathname.replace('/api/auth/', '').replace(/\/$/, '');
    if (!allowed.has(path)) return json({ error: 'Nicht gefunden.' }, 404);
    if (Number(request.headers.get('Content-Length')) > 16000) return json({ error: 'Anfrage zu gross.' }, 413);
    if (request.method === 'POST') {
      const body = await readBody(request);
      request = new Request(request, { body: JSON.stringify(body) });
    }
    return privateResponse(await getAuth(env, request).handler(request));
  } catch (error) { return fail(error); }
}
