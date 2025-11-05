export async function onRequest({ request, env }) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/$/, "");

  if (request.method === 'GET' && path === '/oauth') {
    const state = cryptoRandom();
    const authorize = new URL('https://github.com/login/oauth/authorize');
    authorize.searchParams.set('client_id', env.GITHUB_CLIENT_ID);
    authorize.searchParams.set('scope', 'repo,user:email');
    authorize.searchParams.set('redirect_uri', new URL('/oauth/callback', url.origin));
    authorize.searchParams.set('state', state);
    return new Response(null, {
      status: 302,
      headers: {
        Location: authorize.toString(),
        'Set-Cookie': `oauth_state=${state}; Path=/; HttpOnly; Secure; SameSite=Lax`
      }
    });
  }

  if (request.method === 'GET' && path === '/oauth/callback') {
    const params = new URL(request.url).searchParams;
    const code = params.get('code');
    const state = params.get('state');
    const cookie = parseCookies(request.headers.get('Cookie') || '').oauth_state;
    if (!code || !state || !cookie || state !== cookie) return json({ error: 'invalid_state' }, 400);

    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST', headers: { 'Accept': 'application/json' },
      body: new URLSearchParams({ client_id: env.GITHUB_CLIENT_ID, client_secret: env.GITHUB_CLIENT_SECRET, code })
    });
    const tokenJson = await tokenRes.json();
    if (!tokenJson.access_token) return json({ error: 'no_token', details: tokenJson }, 400);

    return new Response(`<script>window.opener.postMessage({ token: ${JSON.stringify(tokenJson.access_token)} }, '*'); window.close();</script>`, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  return json({ ok: true, hint: 'Use /oauth to start GitHub login' });
}

function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }); }
function cryptoRandom() { return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(24)))).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32); }
function parseCookies(c) { return Object.fromEntries((c||'').split(';').map(v=>v.trim().split('=')).filter(([k])=>k)); }