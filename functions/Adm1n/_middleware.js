const ACCESS_JWT_HEADER = 'Cf-Access-Jwt-Assertion';
const ACCESS_COOKIE_NAME = 'CF_Authorization';
const CERTS_CACHE_TTL_MS = 10 * 60 * 1000;

let cachedCerts = null;
let cachedCertsUntil = 0;

export async function onRequest(context) {
  const config = getAccessConfig(context.env);

  if (!config.teamDomain || config.audiences.length === 0) {
    return new Response('Admin access is not configured.', {
      status: 503,
      headers: securityHeaders(),
    });
  }

  const token = getAccessToken(context.request);
  if (!token) {
    return unauthorized();
  }

  let result;
  try {
    result = await verifyAccessJwt(token, config);
  } catch {
    return unauthorized();
  }

  if (!result.valid) {
    return unauthorized();
  }

  const response = await context.next();
  response.headers.set('Cache-Control', 'no-store');
  response.headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
  return response;
}

function getAccessConfig(env) {
  const teamDomain = normalizeTeamDomain(env.CF_ACCESS_TEAM_DOMAIN || '');
  const audiences = String(env.CF_ACCESS_AUD || '')
    .split(',')
    .map((audience) => audience.trim())
    .filter(Boolean);

  return { teamDomain, audiences };
}

function normalizeTeamDomain(value) {
  return value
    .trim()
    .replace(/^https?:\/\//, '')
    .replace(/\/+$/, '');
}

function getAccessToken(request) {
  const headerToken = request.headers.get(ACCESS_JWT_HEADER);
  if (headerToken) {
    return headerToken.trim();
  }

  const cookie = request.headers.get('Cookie') || '';
  const cookies = cookie.split(';').map((part) => part.trim());
  const accessCookie = cookies.find((part) => part.startsWith(`${ACCESS_COOKIE_NAME}=`));

  if (!accessCookie) {
    return '';
  }

  try {
    return decodeURIComponent(accessCookie.slice(ACCESS_COOKIE_NAME.length + 1));
  } catch {
    return '';
  }
}

async function verifyAccessJwt(token, config) {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return { valid: false };
  }

  let header;
  let payload;
  try {
    header = JSON.parse(decodeBase64UrlToString(parts[0]));
    payload = JSON.parse(decodeBase64UrlToString(parts[1]));
  } catch {
    return { valid: false };
  }

  if (header.alg !== 'RS256' || !header.kid) {
    return { valid: false };
  }

  const issuer = `https://${config.teamDomain}`;
  if (payload.iss !== issuer || !hasExpectedAudience(payload.aud, config.audiences)) {
    return { valid: false };
  }

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp !== 'number' || payload.exp <= now) {
    return { valid: false };
  }
  if (typeof payload.nbf === 'number' && payload.nbf > now) {
    return { valid: false };
  }

  const jwk = await getAccessJwk(config.teamDomain, header.kid);
  if (!jwk) {
    return { valid: false };
  }

  const key = await crypto.subtle.importKey(
    'jwk',
    jwk,
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['verify'],
  );

  const signedData = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const signature = decodeBase64UrlToBytes(parts[2]);
  const validSignature = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    key,
    signature,
    signedData,
  );

  return { valid: validSignature, payload };
}

function hasExpectedAudience(tokenAudience, expectedAudiences) {
  const tokenAudiences = Array.isArray(tokenAudience) ? tokenAudience : [tokenAudience];
  return tokenAudiences.some((audience) => expectedAudiences.includes(audience));
}

async function getAccessJwk(teamDomain, kid) {
  const now = Date.now();
  if (!cachedCerts || cachedCertsUntil <= now) {
    const response = await fetch(`https://${teamDomain}/cdn-cgi/access/certs`);
    if (!response.ok) {
      throw new Error('Unable to fetch Cloudflare Access certificates.');
    }

    cachedCerts = await response.json();
    cachedCertsUntil = now + CERTS_CACHE_TTL_MS;
  }

  return (cachedCerts.keys || []).find((key) => key.kid === kid);
}

function decodeBase64UrlToString(value) {
  return new TextDecoder().decode(decodeBase64UrlToBytes(value));
}

function decodeBase64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = base64.padEnd(base64.length + ((4 - (base64.length % 4)) % 4), '=');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function unauthorized() {
  return new Response('Unauthorized', {
    status: 401,
    headers: securityHeaders(),
  });
}

function securityHeaders() {
  return {
    'Cache-Control': 'no-store',
    'Content-Type': 'text/plain; charset=utf-8',
    'X-Robots-Tag': 'noindex, nofollow, noarchive',
  };
}
