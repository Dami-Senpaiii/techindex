export function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow', 'X-Content-Type-Options': 'nosniff' } });
}
export function privateResponse(response) {
  const result = new Response(response.body, response);
  result.headers.set('Cache-Control', 'private, no-store');
  result.headers.set('X-Robots-Tag', 'noindex, nofollow');
  return result;
}
export function checkOrigin(request) {
  const url = new URL(request.url);
  const local = /^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url.origin);
  if (!local && !['https://techindex.ch', 'https://www.techindex.ch'].includes(url.origin)) throw Object.assign(new Error('Dieser Host ist für Benutzerkonten nicht freigegeben.'), { status: 403 });
  if (!['GET', 'HEAD'].includes(request.method) && request.headers.get('Origin') !== url.origin) throw Object.assign(new Error('Anfrage nicht erlaubt.'), { status: 403 });
}
export async function readBody(request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw Object.assign(new Error('JSON erwartet.'), { status: 415 });
  const reader = request.body?.getReader();
  if (!reader) throw Object.assign(new Error('Leere Anfrage.'), { status: 400 });
  let bytes = 0; const chunks = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; bytes += value.length; if (bytes > 16000) { await reader.cancel(); throw Object.assign(new Error('Anfrage zu gross.'), { status: 413 }); } chunks.push(value); }
  const merged = new Uint8Array(bytes); let offset = 0; for (const chunk of chunks) { merged.set(chunk, offset); offset += chunk.length; }
  const body = new TextDecoder().decode(merged);
  if (body.length > 16000) throw Object.assign(new Error('Anfrage zu gross.'), { status: 413 });
  try { return JSON.parse(body); } catch { throw Object.assign(new Error('Ungültige Anfrage.'), { status: 400 }); }
}
export function fail(error) { return json({ error: error.status ? error.message : 'Der Kontodienst ist gerade nicht erreichbar. Bitte versuche es erneut.' }, error.status || 503); }
